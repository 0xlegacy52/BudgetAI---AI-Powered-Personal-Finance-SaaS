import { Router } from "express";
import { query } from "../db.js";
import { aiChatSchema } from "../../shared/schema.js";
import { authenticate, type AuthRequest } from "../auth.js";
import OpenAI from "openai";

const router = Router();
router.use(authenticate);

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function getUserFinancialContext(userId: number) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [income, expenses, categorySpending, budgets, recentTx, goals] = await Promise.all([
    query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'income' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3", [userId, month, year]),
    query("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3", [userId, month, year]),
    query(`SELECT c.name, SUM(ABS(t.amount)) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = $1 AND t.type = 'expense' AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3 GROUP BY c.name ORDER BY total DESC`, [userId, month, year]),
    query("SELECT b.amount, c.name FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3", [userId, month, year]),
    query("SELECT amount, description, type, date FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT 20", [userId]),
    query("SELECT name, target_amount, current_amount, target_date FROM savings_goals WHERE user_id = $1 AND completed = false", [userId]),
  ]);

  return {
    currentMonth: `${year}-${String(month).padStart(2, "0")}`,
    monthlyIncome: parseFloat(income.rows[0].total),
    monthlyExpenses: parseFloat(expenses.rows[0].total),
    categoryBreakdown: categorySpending.rows.map((r: any) => `${r.name}: $${parseFloat(r.total).toFixed(2)}`).join(", "),
    budgets: budgets.rows.map((r: any) => `${r.name}: $${parseFloat(r.amount).toFixed(2)}`).join(", "),
    recentTransactions: recentTx.rows.map((r: any) => `${r.date}: ${r.type} $${Math.abs(parseFloat(r.amount)).toFixed(2)} - ${r.description}`).join("\n"),
    savingsGoals: goals.rows.map((r: any) => `${r.name}: $${parseFloat(r.current_amount).toFixed(2)}/$${parseFloat(r.target_amount).toFixed(2)} by ${r.target_date}`).join(", "),
  };
}

router.post("/chat", async (req: AuthRequest, res) => {
  try {
    const parsed = aiChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { message } = parsed.data;

    await query("INSERT INTO ai_conversations (user_id, role, content) VALUES ($1, 'user', $2)", [req.userId, message]);

    const openai = getOpenAI();
    if (!openai) {
      const fallbackResponse = generateFallbackResponse(message, req.userId!);
      const responseText = await fallbackResponse;
      await query("INSERT INTO ai_conversations (user_id, role, content) VALUES ($1, 'assistant', $2)", [req.userId, responseText]);
      return res.json({ message: responseText });
    }

    const context = await getUserFinancialContext(req.userId!);

    const history = await query(
      "SELECT role, content FROM ai_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10",
      [req.userId]
    );

    const messages: any[] = [
      {
        role: "system",
        content: `You are BudgetAI, a helpful personal finance assistant. You have access to the user's financial data.

Current month: ${context.currentMonth}
Monthly income: $${context.monthlyIncome.toFixed(2)}
Monthly expenses: $${context.monthlyExpenses.toFixed(2)}
Savings rate: ${context.monthlyIncome > 0 ? (((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100).toFixed(1) : 0}%

Spending by category: ${context.categoryBreakdown || "No spending data yet"}
Budget limits: ${context.budgets || "No budgets set"}
Savings goals: ${context.savingsGoals || "No savings goals"}

Recent transactions:
${context.recentTransactions || "No transactions yet"}

Provide specific, actionable advice based on this data. Be concise and helpful. Use dollar amounts when referencing their data.`,
      },
      ...history.rows.reverse().map((r: any) => ({ role: r.role, content: r.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";

    await query("INSERT INTO ai_conversations (user_id, role, content) VALUES ($1, 'assistant', $2)", [req.userId, responseText]);

    res.json({ message: responseText });
  } catch (error: any) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: "AI chat failed. Please try again." });
  }
});

async function generateFallbackResponse(message: string, userId: number): Promise<string> {
  const context = await getUserFinancialContext(userId);
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("spend") || lowerMsg.includes("expense")) {
    if (context.monthlyExpenses > 0) {
      return `This month you've spent $${context.monthlyExpenses.toFixed(2)} so far. Your spending breakdown: ${context.categoryBreakdown || "No category data available"}. ${context.monthlyIncome > 0 ? `Your savings rate is ${(((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100).toFixed(1)}%.` : ""}`;
    }
    return "You don't have any expenses recorded for this month yet. Start by adding some transactions!";
  }

  if (lowerMsg.includes("income") || lowerMsg.includes("earn")) {
    return `Your income this month is $${context.monthlyIncome.toFixed(2)}. ${context.monthlyExpenses > 0 ? `After expenses of $${context.monthlyExpenses.toFixed(2)}, your net cash flow is $${(context.monthlyIncome - context.monthlyExpenses).toFixed(2)}.` : ""}`;
  }

  if (lowerMsg.includes("save") || lowerMsg.includes("saving") || lowerMsg.includes("goal")) {
    if (context.savingsGoals) {
      return `Your savings goals: ${context.savingsGoals}. ${context.monthlyIncome > 0 ? `Your current savings rate is ${(((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100).toFixed(1)}%.` : ""}`;
    }
    return "You haven't set any savings goals yet. Create one to start tracking your progress!";
  }

  if (lowerMsg.includes("budget")) {
    if (context.budgets) {
      return `Your budget limits: ${context.budgets}. Spending so far: ${context.categoryBreakdown || "No spending yet"}.`;
    }
    return "You haven't set any budgets yet. Setting budgets helps you control spending in each category.";
  }

  return `Here's your financial snapshot: Income: $${context.monthlyIncome.toFixed(2)}, Expenses: $${context.monthlyExpenses.toFixed(2)}, Net: $${(context.monthlyIncome - context.monthlyExpenses).toFixed(2)}. ${context.categoryBreakdown ? `Top spending: ${context.categoryBreakdown}` : "Add transactions to get detailed insights!"}\n\nTip: Connect an OpenAI API key in settings for more detailed AI-powered advice.`;
}

router.get("/history", async (req: AuthRequest, res) => {
  try {
    const result = await query(
      "SELECT role, content, created_at FROM ai_conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [req.userId]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

router.delete("/history", async (req: AuthRequest, res) => {
  try {
    await query("DELETE FROM ai_conversations WHERE user_id = $1", [req.userId]);
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear chat history" });
  }
});

router.get("/report", async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year ? Number(year) : new Date().getFullYear();

    const report = await query(
      "SELECT * FROM ai_reports WHERE user_id = $1 AND month = $2 AND year = $3",
      [req.userId, m, y]
    );

    if (report.rows.length > 0) {
      return res.json({ report: report.rows[0] });
    }

    const context = await getUserFinancialContext(req.userId!);

    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const prevExpenses = await query(
      "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3",
      [req.userId, prevMonth, prevYear]
    );

    const prevTotal = parseFloat(prevExpenses.rows[0].total);
    const changePercent = prevTotal > 0 ? ((context.monthlyExpenses - prevTotal) / prevTotal * 100).toFixed(1) : "N/A";

    const reportContent = `# Monthly Financial Report - ${y}-${String(m).padStart(2, "0")}

## Summary
- **Total Income:** $${context.monthlyIncome.toFixed(2)}
- **Total Expenses:** $${context.monthlyExpenses.toFixed(2)}
- **Net Cash Flow:** $${(context.monthlyIncome - context.monthlyExpenses).toFixed(2)}
- **Savings Rate:** ${context.monthlyIncome > 0 ? (((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100).toFixed(1) : 0}%

## Month-over-Month
- Previous month expenses: $${prevTotal.toFixed(2)}
- Change: ${changePercent}%

## Spending Breakdown
${context.categoryBreakdown || "No spending data"}

## Savings Goals
${context.savingsGoals || "No active goals"}

## Tips
${context.monthlyExpenses > context.monthlyIncome ? "⚠️ You're spending more than you earn this month. Review your spending categories for potential cuts." : "✅ You're spending within your income. Keep it up!"}
${context.savingsGoals ? "Keep contributing to your savings goals regularly." : "Consider setting up savings goals to build financial security."}`;

    await query(
      "INSERT INTO ai_reports (user_id, month, year, content, summary) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, month, year) DO UPDATE SET content = $4, summary = $5",
      [req.userId, m, y, reportContent, `Income: $${context.monthlyIncome.toFixed(2)} | Expenses: $${context.monthlyExpenses.toFixed(2)} | Rate: ${context.monthlyIncome > 0 ? (((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100).toFixed(1) : 0}%`]
    );

    const newReport = await query("SELECT * FROM ai_reports WHERE user_id = $1 AND month = $2 AND year = $3", [req.userId, m, y]);
    res.json({ report: newReport.rows[0] });
  } catch (error: any) {
    console.error("AI report error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;

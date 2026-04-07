import { Router } from "express";
import { query } from "../db.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [accountsRes, incomeRes, expenseRes, categorySpendingRes, monthlyTrendRes, recentTransactionsRes, savingsGoalsRes, budgetProgressRes] = await Promise.all([
      query("SELECT COALESCE(SUM(balance), 0) as net_worth, COUNT(*) as account_count FROM accounts WHERE user_id = $1", [req.userId]),
      query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'income' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3",
        [req.userId, month, year]
      ),
      query(
        "SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = $1 AND type = 'expense' AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3",
        [req.userId, month, year]
      ),
      query(
        `SELECT c.name, c.color, COALESCE(SUM(ABS(t.amount)), 0) as total
         FROM categories c
         LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = $1 AND t.type = 'expense'
           AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3
         WHERE (c.user_id = $1 OR c.is_default = true)
         GROUP BY c.id, c.name, c.color
         HAVING COALESCE(SUM(ABS(t.amount)), 0) > 0
         ORDER BY total DESC`,
        [req.userId, month, year]
      ),
      query(
        `SELECT EXTRACT(MONTH FROM date) as month, EXTRACT(YEAR FROM date) as year,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN ABS(amount) ELSE 0 END) as expenses
         FROM transactions WHERE user_id = $1 AND date >= NOW() - INTERVAL '6 months'
         GROUP BY EXTRACT(MONTH FROM date), EXTRACT(YEAR FROM date)
         ORDER BY year, month`,
        [req.userId]
      ),
      query(
        `SELECT t.*, c.name as category_name, c.color as category_color
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1
         ORDER BY t.date DESC, t.id DESC LIMIT 5`,
        [req.userId]
      ),
      query("SELECT * FROM savings_goals WHERE user_id = $1 AND completed = false ORDER BY target_date LIMIT 3", [req.userId]),
      query(
        `SELECT b.*, c.name as category_name, c.color as category_color,
         COALESCE((SELECT SUM(ABS(t.amount)) FROM transactions t 
                   WHERE t.user_id = $1 AND t.category_id = b.category_id AND t.type = 'expense'
                   AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3), 0) as spent
         FROM budgets b
         JOIN categories c ON b.category_id = c.id
         WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3`,
        [req.userId, month, year]
      ),
    ]);

    const income = parseFloat(incomeRes.rows[0].total);
    const expenses = parseFloat(expenseRes.rows[0].total);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    res.json({
      netWorth: parseFloat(accountsRes.rows[0].net_worth),
      accountCount: parseInt(accountsRes.rows[0].account_count),
      monthlyIncome: income,
      monthlyExpenses: expenses,
      savingsRate: Math.round(savingsRate * 10) / 10,
      cashFlow: income - expenses,
      categorySpending: categorySpendingRes.rows,
      monthlyTrend: monthlyTrendRes.rows,
      recentTransactions: recentTransactionsRes.rows,
      savingsGoals: savingsGoalsRes.rows,
      budgetProgress: budgetProgressRes.rows,
      month,
      year,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;

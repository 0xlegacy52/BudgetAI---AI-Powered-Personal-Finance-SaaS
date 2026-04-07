import { Router } from "express";
import { query } from "../db.js";
import { budgetSchema } from "../../shared/schema.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const y = year ? Number(year) : new Date().getFullYear();

    const budgets = await query(
      `SELECT b.*, c.name as category_name, c.color as category_color,
       COALESCE((SELECT SUM(ABS(t.amount)) FROM transactions t 
                 WHERE t.user_id = $1 AND t.category_id = b.category_id 
                 AND t.type = 'expense'
                 AND EXTRACT(MONTH FROM t.date) = $2 AND EXTRACT(YEAR FROM t.date) = $3), 0) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       ORDER BY c.name`,
      [req.userId, m, y]
    );

    res.json({ budgets: budgets.rows, month: m, year: y });
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { categoryId, amount, month, year, rollover } = parsed.data;

    const result = await query(
      `INSERT INTO budgets (user_id, category_id, amount, month, year, rollover)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, category_id, month, year) 
       DO UPDATE SET amount = $3, rollover = $6, updated_at = NOW()
       RETURNING *`,
      [req.userId, categoryId, amount, month, year, rollover || false]
    );

    res.status(201).json({ budget: result.rows[0] });
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const result = await query("DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    res.json({ message: "Budget deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;

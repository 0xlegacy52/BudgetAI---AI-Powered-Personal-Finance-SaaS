import { Router } from "express";
import { query } from "../db.js";
import { savingsGoalSchema } from "../../shared/schema.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const result = await query("SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY target_date", [req.userId]);
    res.json({ goals: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch savings goals" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = savingsGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, targetAmount, currentAmount, targetDate } = parsed.data;
    const result = await query(
      "INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.userId, name, targetAmount, currentAmount || 0, targetDate]
    );

    res.status(201).json({ goal: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to create savings goal" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = savingsGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, targetAmount, currentAmount, targetDate } = parsed.data;
    const result = await query(
      `UPDATE savings_goals SET name = $1, target_amount = $2, current_amount = $3, target_date = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, targetAmount, currentAmount || 0, targetDate, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Savings goal not found" });
    }

    res.json({ goal: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to update savings goal" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const result = await query("DELETE FROM savings_goals WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Savings goal not found" });
    }
    res.json({ message: "Savings goal deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete savings goal" });
  }
});

export default router;

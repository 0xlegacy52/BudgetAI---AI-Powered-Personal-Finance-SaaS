import { Router } from "express";
import { query } from "../db.js";
import { transactionSchema } from "../../shared/schema.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { month, year, categoryId, type, search, limit = "50", offset = "0" } = req.query;
    let sql = `SELECT t.*, c.name as category_name, c.color as category_color, a.name as account_name 
               FROM transactions t 
               LEFT JOIN categories c ON t.category_id = c.id 
               LEFT JOIN accounts a ON t.account_id = a.id 
               WHERE t.user_id = $1`;
    const params: any[] = [req.userId];
    let paramIndex = 2;

    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM t.date) = $${paramIndex} AND EXTRACT(YEAR FROM t.date) = $${paramIndex + 1}`;
      params.push(Number(month), Number(year));
      paramIndex += 2;
    }

    if (categoryId) {
      sql += ` AND t.category_id = $${paramIndex}`;
      params.push(Number(categoryId));
      paramIndex++;
    }

    if (type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (search) {
      sql += ` AND (t.description ILIKE $${paramIndex} OR t.merchant_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY t.date DESC, t.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await query(sql, params);

    const countSql = `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
    const countResult = await query(countSql, [req.userId]);

    res.json({ transactions: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error: any) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { amount, description, date, categoryId, subCategory, type, notes, tags, accountId, isRecurring } = parsed.data;

    const result = await query(
      `INSERT INTO transactions (user_id, account_id, category_id, amount, description, sub_category, type, date, notes, tags, is_recurring)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [req.userId, accountId || null, categoryId || null, amount, description, subCategory || null, type, date, notes || null, tags || null, isRecurring || false]
    );

    if (accountId) {
      const amountChange = type === "income" ? amount : -amount;
      await query("UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3", [amountChange, accountId, req.userId]);
    }

    res.status(201).json({ transaction: result.rows[0] });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { amount, description, date, categoryId, subCategory, type, notes, tags, accountId, isRecurring } = parsed.data;

    const result = await query(
      `UPDATE transactions SET amount = $1, description = $2, date = $3, category_id = $4, sub_category = $5, 
       type = $6, notes = $7, tags = $8, account_id = $9, is_recurring = $10, updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [amount, description, date, categoryId || null, subCategory || null, type, notes || null, tags || null, accountId || null, isRecurring || false, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error: any) {
    console.error("Update transaction error:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const existing = await query("SELECT * FROM transactions WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const tx = existing.rows[0];
    if (tx.account_id) {
      const amountChange = tx.type === "income" ? -parseFloat(tx.amount) : parseFloat(tx.amount);
      await query("UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2", [amountChange, tx.account_id]);
    }

    await query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
    res.json({ message: "Transaction deleted" });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;

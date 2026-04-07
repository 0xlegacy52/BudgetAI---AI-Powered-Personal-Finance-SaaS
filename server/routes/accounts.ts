import { Router } from "express";
import { query } from "../db.js";
import { accountSchema } from "../../shared/schema.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const result = await query("SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at", [req.userId]);
    res.json({ accounts: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, type, balance, institution } = parsed.data;
    const result = await query(
      "INSERT INTO accounts (user_id, name, type, balance, institution) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.userId, name, type, balance, institution || null]
    );

    res.status(201).json({ account: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, type, balance, institution } = parsed.data;
    const result = await query(
      "UPDATE accounts SET name = $1, type = $2, balance = $3, institution = $4, updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *",
      [name, type, balance, institution || null, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json({ account: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to update account" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const result = await query("DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json({ message: "Account deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;

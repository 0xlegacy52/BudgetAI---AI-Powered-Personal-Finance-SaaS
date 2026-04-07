import { Router } from "express";
import { query } from "../db.js";
import { authenticate, type AuthRequest } from "../auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const result = await query(
      "SELECT * FROM categories WHERE user_id = $1 OR is_default = true ORDER BY is_default DESC, name",
      [req.userId]
    );
    res.json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;

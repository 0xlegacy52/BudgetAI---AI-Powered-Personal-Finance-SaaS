import { Router } from "express";
import { query } from "../db.js";
import { registerSchema, loginSchema } from "../../shared/schema.js";
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken, authenticate, type AuthRequest } from "../auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { name, email, password } = parsed.data;

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const tokens = generateTokens(user.id);

    await query(
      "INSERT INTO sessions (user_id, token, device, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
      [user.id, tokens.refreshToken, req.headers["user-agent"] || "unknown"]
    );

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, ...tokens });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { email, password } = parsed.data;

    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokens = generateTokens(user.id);

    await query(
      "INSERT INTO sessions (user_id, token, device, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
      [user.id, tokens.refreshToken, req.headers["user-agent"] || "unknown"]
    );

    res.json({
      user: { id: user.id, name: user.name, email: user.email, currency: user.currency, locale: user.locale },
      ...tokens,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const session = await query("SELECT * FROM sessions WHERE token = $1 AND user_id = $2 AND expires_at > NOW()", [
      refreshToken,
      decoded.userId,
    ]);

    if (session.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const tokens = generateTokens(decoded.userId);

    await query("UPDATE sessions SET token = $1, expires_at = NOW() + INTERVAL '7 days' WHERE token = $2", [
      tokens.refreshToken,
      refreshToken,
    ]);

    res.json(tokens);
  } catch (error: any) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

router.post("/logout", authenticate, async (req: AuthRequest, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.slice(7);
  await query("DELETE FROM sessions WHERE user_id = $1", [req.userId]);
  res.json({ message: "Logged out" });
});

router.get("/sessions", authenticate, async (req: AuthRequest, res) => {
  const result = await query(
    "SELECT id, device, ip_address, created_at, expires_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json({ sessions: result.rows });
});

router.delete("/sessions/:id", authenticate, async (req: AuthRequest, res) => {
  await query("DELETE FROM sessions WHERE id = $1 AND user_id = $2", [req.params.id, req.userId]);
  res.json({ message: "Session revoked" });
});

export default router;

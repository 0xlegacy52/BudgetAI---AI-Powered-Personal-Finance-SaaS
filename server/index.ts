import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { query } from "./db.js";
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import accountRoutes from "./routes/accounts.js";
import budgetRoutes from "./routes/budgets.js";
import categoryRoutes from "./routes/categories.js";
import savingsRoutes from "./routes/savings.js";
import dashboardRoutes from "./routes/dashboard.js";
import aiRoutes from "./routes/ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await query(schema);
    console.log("Database schema initialized");

    const categories = await query("SELECT COUNT(*) FROM categories WHERE is_default = true");
    if (parseInt(categories.rows[0].count) === 0) {
      const defaultCategories = [
        { name: "Food", color: "#f97316", icon: "utensils" },
        { name: "Transport", color: "#3b82f6", icon: "car" },
        { name: "Shopping", color: "#a855f7", icon: "shopping-bag" },
        { name: "Bills", color: "#ef4444", icon: "file-text" },
        { name: "Health", color: "#10b981", icon: "heart" },
        { name: "Entertainment", color: "#f59e0b", icon: "film" },
        { name: "Travel", color: "#06b6d4", icon: "plane" },
        { name: "Income", color: "#22c55e", icon: "trending-up" },
        { name: "Transfer", color: "#6b7280", icon: "repeat" },
        { name: "Other", color: "#78716c", icon: "more-horizontal" },
      ];

      for (const cat of defaultCategories) {
        await query("INSERT INTO categories (name, color, icon, is_default) VALUES ($1, $2, $3, true)", [cat.name, cat.color, cat.icon]);
      }
      console.log("Default categories created");
    }
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

async function startServer() {
  await initDatabase();

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "../vite.config.ts"),
      server: { middlewareMode: true, hmr: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use((req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api")) return next();
      try {
        const clientPath = path.resolve(__dirname, "../client/index.html");
        let template = fs.readFileSync(clientPath, "utf-8");
        vite.transformIndexHtml(url, template).then((html) => {
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
        }).catch(next);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, "../dist/public");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use((_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BudgetAI server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

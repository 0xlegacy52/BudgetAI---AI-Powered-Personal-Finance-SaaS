# BudgetAI - AI-Powered Personal Finance SaaS

## Overview
BudgetAI is a full-stack personal finance application that uses AI to analyze spending patterns and provide actionable financial advice.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express 5 + TypeScript (tsx runtime)
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4o (optional - falls back to built-in analytics)
- **Charts**: Recharts
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Auth**: JWT (access + refresh tokens)

## Architecture
- Single Express server on port 5000 serving both API and frontend
- Vite middleware in development for HMR
- Static file serving in production (built to dist/public)
- PostgreSQL with raw SQL queries (via pg driver)

## Project Structure
```
├── server/              # Express backend
│   ├── index.ts         # Server entry, DB init, Vite middleware
│   ├── db.ts            # PostgreSQL connection pool
│   ├── auth.ts          # JWT auth helpers + middleware
│   ├── schema.sql       # Database schema
│   └── routes/          # API route handlers
│       ├── auth.ts      # Register, login, refresh, sessions
│       ├── transactions.ts
│       ├── accounts.ts
│       ├── budgets.ts
│       ├── categories.ts
│       ├── savings.ts
│       ├── dashboard.ts
│       └── ai.ts        # AI chat, reports
├── client/              # React frontend
│   ├── index.html
│   └── src/
│       ├── main.tsx     # Entry point
│       ├── App.tsx      # Root with auth routing
│       ├── index.css    # Tailwind + theme vars
│       ├── lib/
│       │   ├── api.ts   # API client with token refresh
│       │   └── utils.ts # Formatting, cn helper
│       ├── hooks/
│       │   └── useAuth.ts
│       ├── components/
│       │   ├── ui/      # shadcn-style components
│       │   └── layout/
│       │       └── Sidebar.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx
│           ├── Transactions.tsx
│           ├── Accounts.tsx
│           ├── Budgets.tsx
│           ├── Savings.tsx
│           ├── AiChat.tsx
│           ├── Reports.tsx
│           └── Settings.tsx
├── shared/
│   └── schema.ts        # Zod validation schemas
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Database Tables
- users, sessions, categories, accounts, transactions, budgets, savings_goals, ai_conversations, ai_reports

## Key Features
- Email/password auth with JWT refresh tokens
- Session management (view/revoke)
- Transaction CRUD with categories, tags, notes
- Account management (checking, savings, credit card, etc.)
- Budget tracking with progress visualization
- Savings goals with progress tracking
- AI chat assistant (OpenAI or built-in analytics fallback)
- Monthly financial reports
- Dashboard with charts (bar chart, donut chart, budget progress)

## Environment Variables
- DATABASE_URL 
- OPENAI_API_KEY (optional - for enhanced AI features)

## Commands
- `npm run dev` - Start development server (port 5000)
- `npm run build` - Build frontend for production
- `npm run start` - Start production server

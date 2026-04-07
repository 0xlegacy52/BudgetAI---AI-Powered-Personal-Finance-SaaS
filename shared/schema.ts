import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const categoryNames = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Travel",
  "Income",
  "Transfer",
  "Other",
] as const;

export const subCategories: Record<string, string[]> = {
  Food: ["Groceries", "Restaurants", "Coffee", "Fast Food", "Delivery"],
  Transport: ["Gas", "Public Transit", "Rideshare", "Parking", "Maintenance"],
  Shopping: ["Clothing", "Electronics", "Home", "Personal Care", "Gifts"],
  Bills: ["Rent", "Utilities", "Insurance", "Phone", "Internet", "Subscriptions"],
  Health: ["Doctor", "Pharmacy", "Gym", "Dental", "Vision"],
  Entertainment: ["Movies", "Music", "Games", "Sports", "Hobbies"],
  Travel: ["Flights", "Hotels", "Car Rental", "Activities"],
  Income: ["Salary", "Freelance", "Investment", "Refund", "Other Income"],
  Transfer: ["Bank Transfer", "Credit Card Payment", "Savings"],
  Other: ["Miscellaneous"],
};

export type CategoryName = (typeof categoryNames)[number];

export const transactionSchema = z.object({
  amount: z.number(),
  description: z.string().min(1),
  date: z.string(),
  categoryId: z.number().optional(),
  subCategory: z.string().optional(),
  type: z.enum(["income", "expense", "transfer"]),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  accountId: z.number().optional(),
  isRecurring: z.boolean().optional(),
});

export const accountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["checking", "savings", "credit_card", "investment", "manual"]),
  balance: z.number(),
  institution: z.string().optional(),
});

export const budgetSchema = z.object({
  categoryId: z.number(),
  amount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number(),
  rollover: z.boolean().optional(),
});

export const savingsGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.string(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(1000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type AiChatInput = z.infer<typeof aiChatSchema>;

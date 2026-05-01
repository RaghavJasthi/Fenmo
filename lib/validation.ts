import { z } from "zod";

export const createExpenseSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().trim().optional().default(""),
  date: z
    .string()
    .trim()
    .min(1, "Date is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Date must be valid."),
  idempotencyKey: z.string().trim().min(1, "Idempotency key is required."),
});

export const expenseQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  sort: z
    .enum(["date_desc", "date_asc", "amount_desc", "amount_asc"])
    .optional()
    .default("date_desc"),
});

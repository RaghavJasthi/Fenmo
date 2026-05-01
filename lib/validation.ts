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
  userId: z.string().trim().min(1, "User is required."),
});

export const expenseQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  sort: z
    .enum(["date_desc", "date_asc", "amount_desc", "amount_asc"])
    .optional()
    .default("date_desc"),
});

export const authSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = authSchema.extend({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
});

export const loginSchema = authSchema.pick({
  email: true,
  password: true,
});

export const verifyOtpSchema = z.object({
  otpRequestId: z.string().trim().min(1, "OTP request is required."),
  otpCode: z.string().trim().regex(/^\d{6}$/, "OTP must be a 6 digit code."),
});

export const googleAuthSchema = z.object({
  credential: z.string().trim().min(1, "Google credential is required."),
});

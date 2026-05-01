import { Prisma } from "@prisma/client";
import type { ExpenseRepository } from "@/lib/expense-service";
import { prisma } from "@/lib/prisma";

export const prismaExpenseRepository: ExpenseRepository = {
  async findByIdempotencyKey({ idempotencyKey, userId }) {
    return prisma.expense.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    });
  },

  async createExpense(input) {
    return prisma.expense.create({
      data: input,
    });
  },

  async listExpenses({ userId, category, sort }) {
    const orderByMap: Record<string, Prisma.ExpenseOrderByWithRelationInput[]> = {
      date_desc: [{ date: "desc" }, { createdAt: "desc" }],
      date_asc: [{ date: "asc" }, { createdAt: "asc" }],
      amount_desc: [{ amountMinor: "desc" }, { date: "desc" }, { createdAt: "desc" }],
      amount_asc: [{ amountMinor: "asc" }, { date: "asc" }, { createdAt: "asc" }],
    };

    return prisma.expense.findMany({
      where: {
        userId,
        ...(category ? { category } : {}),
      },
      orderBy: orderByMap[sort],
    });
  },
};

import { formatMinorAsCurrency, parseAmountToMinor } from "@/lib/money";
import { createExpenseSchema, expenseQuerySchema } from "@/lib/validation";
import type { Expense, ExpenseListResponse, ExpenseSortOption } from "@/lib/types";

type ExpenseRecord = {
  id: string;
  amountMinor: number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  idempotencyKey: string;
  userId: string;
};

export type CreateExpenseInput = {
  amount: string | number;
  category: string;
  description?: string;
  date: string;
  idempotencyKey: string;
  userId: string;
};

export type ListExpenseInput = {
  category?: string;
  sort?: string;
};

export interface ExpenseRepository {
  findByIdempotencyKey(input: { idempotencyKey: string; userId: string }): Promise<ExpenseRecord | null>;
  createExpense(input: {
    amountMinor: number;
    category: string;
    description: string;
    date: Date;
    idempotencyKey: string;
    userId: string;
  }): Promise<ExpenseRecord>;
  listExpenses(filter: {
    userId: string;
    category?: string;
    sort: ExpenseSortOption;
  }): Promise<ExpenseRecord[]>;
}

export async function createExpense(
  repository: ExpenseRepository,
  input: CreateExpenseInput,
): Promise<Expense> {
  const parsed = createExpenseSchema.parse(input);
  const existing = await repository.findByIdempotencyKey({
    idempotencyKey: parsed.idempotencyKey,
    userId: parsed.userId,
  });

  if (existing) {
    return toExpenseDto(existing);
  }

  const created = await repository.createExpense({
    amountMinor: parseAmountToMinor(parsed.amount),
    category: parsed.category,
    description: parsed.description ?? "",
    date: new Date(parsed.date),
    idempotencyKey: parsed.idempotencyKey,
    userId: parsed.userId,
  });

  return toExpenseDto(created);
}

export async function listExpenses(
  repository: ExpenseRepository,
  input: ListExpenseInput & { userId: string },
): Promise<ExpenseListResponse> {
  const parsed = expenseQuerySchema.parse(input);
  const records = await repository.listExpenses({
    userId: input.userId,
    category: parsed.category,
    sort: parsed.sort,
  });

  const totalAmountMinor = records.reduce((sum, item) => sum + item.amountMinor, 0);

  return {
    expenses: records.map(toExpenseDto),
    totalAmountMinor,
    totalAmount: formatMinorAsCurrency(totalAmountMinor),
    count: records.length,
  };
}

export function toExpenseDto(record: ExpenseRecord): Expense {
  return {
    id: record.id,
    amount: formatMinorAsCurrency(record.amountMinor),
    amountMinor: record.amountMinor,
    category: record.category,
    description: record.description,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}

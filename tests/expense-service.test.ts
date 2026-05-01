import { describe, expect, it } from "vitest";
import { createExpense, listExpenses, type ExpenseRepository } from "@/lib/expense-service";
import { formatMinorAsCurrency, parseAmountToMinor } from "@/lib/money";

function createInMemoryRepository(): ExpenseRepository {
  const records: Array<{
    id: string;
    amountMinor: number;
    category: string;
    description: string;
    date: Date;
    createdAt: Date;
    idempotencyKey: string;
  }> = [];

  return {
    async findByIdempotencyKey(idempotencyKey) {
      return records.find((item) => item.idempotencyKey === idempotencyKey) ?? null;
    },
    async createExpense(input) {
      const record = {
        id: `exp_${records.length + 1}`,
        createdAt: new Date(`2025-01-0${records.length + 1}T10:00:00.000Z`),
        ...input,
      };
      records.push(record);
      return record;
    },
    async listExpenses({ category, sort }) {
      const filtered = [...records].filter((item) => (category ? item.category === category : true));

      if (sort === "date_asc") {
        return filtered.sort((left, right) => left.date.getTime() - right.date.getTime());
      }

      if (sort === "amount_desc") {
        return filtered.sort((left, right) => right.amountMinor - left.amountMinor);
      }

      if (sort === "amount_asc") {
        return filtered.sort((left, right) => left.amountMinor - right.amountMinor);
      }

      return filtered.sort((left, right) => right.date.getTime() - left.date.getTime());
    },
  };
}

describe("money helpers", () => {
  it("parses decimal amounts into money-safe minor units", () => {
    expect(parseAmountToMinor("499.50")).toBe(49950);
    expect(formatMinorAsCurrency(49950)).toBe("₹499.50");
  });
});

describe("expense service", () => {
  it("creates one record even if the same request is retried", async () => {
    const repository = createInMemoryRepository();
    const payload = {
      amount: "399.99",
      category: "Food",
      description: "Lunch",
      date: "2025-01-11",
      idempotencyKey: "same-request",
    };

    const first = await createExpense(repository, payload);
    const second = await createExpense(repository, payload);

    expect(first.id).toBe(second.id);
    expect(first.amountMinor).toBe(39999);
  });

  it("filters, sorts, and totals the visible list correctly", async () => {
    const repository = createInMemoryRepository();

    await createExpense(repository, {
      amount: "100.00",
      category: "Food",
      description: "Breakfast",
      date: "2025-01-01",
      idempotencyKey: "a",
    });
    await createExpense(repository, {
      amount: "250.00",
      category: "Transport",
      description: "Cab",
      date: "2025-01-03",
      idempotencyKey: "b",
    });
    await createExpense(repository, {
      amount: "80.00",
      category: "Food",
      description: "Snack",
      date: "2025-01-02",
      idempotencyKey: "c",
    });

    const result = await listExpenses(repository, {
      category: "Food",
      sort: "date_desc",
    });

    expect(result.count).toBe(2);
    expect(result.totalAmountMinor).toBe(18000);
    expect(result.expenses[0]?.description).toBe("Snack");
    expect(result.expenses[1]?.description).toBe("Breakfast");
  });

  it("supports sorting by highest amount", async () => {
    const repository = createInMemoryRepository();

    await createExpense(repository, {
      amount: "100.00",
      category: "Food",
      description: "Breakfast",
      date: "2025-01-01",
      idempotencyKey: "highest-a",
    });
    await createExpense(repository, {
      amount: "450.00",
      category: "Food",
      description: "Groceries",
      date: "2025-01-02",
      idempotencyKey: "highest-b",
    });

    const result = await listExpenses(repository, {
      sort: "amount_desc",
    });

    expect(result.expenses[0]?.description).toBe("Groceries");
    expect(result.expenses[1]?.description).toBe("Breakfast");
  });
});

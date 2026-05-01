"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import type { Expense, ExpenseListResponse } from "@/lib/types";
import type { ExpenseSortOption } from "@/lib/expense-service";

type FormState = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

const initialFormState = (): FormState => ({
  amount: "",
  category: "Food",
  description: "",
  date: new Date().toISOString().slice(0, 10),
});

const SORT_OPTIONS: Array<{ value: ExpenseSortOption; label: string }> = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
];

export function ExpenseTracker() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sort, setSort] = useState<ExpenseSortOption>("date_desc");
  const [totalAmount, setTotalAmount] = useState("₹0.00");
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inflightKey = useRef<string | null>(null);

  useEffect(() => {
    void fetchExpenses();
  }, [categoryFilter, sort]);

  async function fetchExpenses() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ sort });
      if (categoryFilter !== "All") {
        params.set("category", categoryFilter);
      }

      const response = await fetch(`/api/expenses?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load expenses.");
      }

      const data = (await response.json()) as ExpenseListResponse;
      setExpenses(data.expenses);
      setTotalAmount(data.totalAmount);
      setCount(data.count);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!inflightKey.current) {
      inflightKey.current = crypto.randomUUID();
    }

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          idempotencyKey: inflightKey.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Could not save expense.");
      }

      setForm(initialFormState());
      setSuccess("Expense saved successfully.");
      inflightKey.current = null;
      await fetchExpenses();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Personal Finance Tool</span>
        <h1>Track the spending that shapes your month.</h1>
        <p>
          Record expenses, review where your money is going, and rely on safe retry-aware
          submission behavior even if the network is messy or the page refreshes.
        </p>
      </section>

      <section className="grid">
        <aside className="card panel">
          <h2>Add Expense</h2>
          <p className="meta">Amounts are stored in money-safe minor units and displayed in INR.</p>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="499.50"
                required
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Optional note about the expense"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            <div className="submit-row">
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Expense"}
              </button>
              <span className="meta">Retries reuse the same idempotency key while the request is active.</span>
            </div>
          </form>

          {error ? <p className="status error">{error}</p> : null}
          {success ? <p className="status success">{success}</p> : null}
        </aside>

        <section className="card panel">
          <div className="toolbar">
            <div>
              <h2>Expense History</h2>
              <p className="meta">Sort and filter the list, with totals based on the visible results.</p>
            </div>

            <div className="total-box">
              <span className="meta">Visible total</span>
              <strong>{totalAmount}</strong>
              <span className="meta">{count} expense{count === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="toolbar-controls">
            <div className="field">
              <label htmlFor="filter-category">Filter by category</label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="sort-order">Sort</label>
              <select
                id="sort-order"
                value={sort}
                onChange={(event) => setSort(event.target.value as ExpenseSortOption)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? <p className="loading">Loading expenses...</p> : null}

          {!isLoading && expenses.length === 0 ? (
            <p className="empty">No expenses match the current view yet.</p>
          ) : null}

          {!isLoading && expenses.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="amount">{expense.amount}</td>
                      <td>{expense.category}</td>
                      <td>{formatDate(expense.date)}</td>
                      <td>{expense.description || "—"}</td>
                      <td>{formatDateTime(expense.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

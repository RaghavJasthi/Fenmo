export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Bills"
  | "Shopping"
  | "Health"
  | "Entertainment"
  | "Other";

export type Expense = {
  id: string;
  amount: string;
  amountMinor: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
};

export type ExpenseListResponse = {
  expenses: Expense[];
  totalAmount: string;
  totalAmountMinor: number;
  count: number;
};

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

export type ExpenseSortOption =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type SessionResponse = {
  user: AuthUser | null;
};

export type AuthActionResponse = {
  user?: AuthUser;
  otpRequestId?: string;
  developmentOtp?: string;
  message?: string;
};

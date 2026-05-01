"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import type {
  AuthActionResponse,
  AuthUser,
  Expense,
  ExpenseListResponse,
  ExpenseSortOption,
  SessionResponse,
} from "@/lib/types";

type FormState = {
  amount: string;
  category: string;
  description: string;
  date: string;
};

type AuthMode = "login" | "register";

type AuthFormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type OtpState = {
  otpRequestId: string;
  code: string;
  developmentOtp?: string;
  email: string;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ExpenseTracker() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otpState, setOtpState] = useState<OtpState | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [sort, setSort] = useState<ExpenseSortOption>("date_desc");
  const [totalAmount, setTotalAmount] = useState("₹0.00");
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const inflightKey = useRef<string | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetchSession();
  }, []);

  useEffect(() => {
    if (user) {
      void fetchExpenses();
    } else {
      setExpenses([]);
      setTotalAmount("₹0.00");
      setCount(0);
      setIsLoading(false);
    }
  }, [categoryFilter, sort, user]);

  useEffect(() => {
    if (!user && !otpState) {
      mountGoogleButton();
    }
  }, [user, otpState, authMode]);

  async function fetchSession() {
    setIsAuthenticating(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await response.json()) as SessionResponse;
      setUser(data.user);
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function fetchExpenses() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort });
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      const response = await fetch(`/api/expenses?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load expenses.");
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
    if (!inflightKey.current) inflightKey.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, idempotencyKey: inflightKey.current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not save expense.");
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

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);
    try {
      if (authMode === "register" && authForm.password !== authForm.confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const endpoint =
        authMode === "register" ? "/api/auth/register" : "/api/auth/login/request-otp";
      const payload =
        authMode === "register"
          ? { name: authForm.name, email: authForm.email, password: authForm.password }
          : { email: authForm.email, password: authForm.password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as AuthActionResponse;
      if (!response.ok) throw new Error(data.message ?? "Authentication failed.");
      setOtpState({
        otpRequestId: data.otpRequestId ?? "",
        code: "",
        developmentOtp: data.developmentOtp,
        email: authForm.email,
      });
      setSuccess(
        authMode === "register"
          ? data.message ?? "Account created. Verify the OTP to continue."
          : data.message ?? "OTP sent.",
      );
    } catch (authSubmitError) {
      setAuthError(authSubmitError instanceof Error ? authSubmitError.message : "Unknown error.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpState) return;
    setAuthError(null);
    setIsSubmittingAuth(true);
    try {
      const response = await fetch("/api/auth/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpRequestId: otpState.otpRequestId, otpCode: otpState.code }),
      });
      const data = (await response.json()) as AuthActionResponse;
      if (!response.ok) throw new Error(data.message ?? "OTP verification failed.");
      setUser(data.user ?? null);
      setOtpState(null);
      setAuthForm({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Signed in successfully.");
    } catch (otpError) {
      setAuthError(otpError instanceof Error ? otpError.message : "Unknown error.");
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  function mountGoogleButton() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current || typeof window === "undefined") return;
    const scriptId = "google-identity-script";
    const existingScript = document.getElementById(scriptId);
    const renderButton = () => {
      const google = (window as typeof window & {
        google?: {
          accounts: {
            id: {
              initialize: (config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
              }) => void;
              renderButton: (
                element: HTMLElement,
                options: { theme: string; size: string; shape: string; text: string; width: number },
              ) => void;
            };
          };
        };
      }).google;
      if (!google || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = "";
      google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => { void handleGoogleSignIn(credential); },
      });
      google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 360,
      });
    };
    if (existingScript) { renderButton(); return; }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }

  async function handleGoogleSignIn(credential: string) {
    setAuthError(null);
    setIsGoogleLoading(true);
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = (await response.json()) as AuthActionResponse;
      if (!response.ok) throw new Error(data.message ?? "Google sign-in failed.");
      setUser(data.user ?? null);
      setSuccess("Signed in with Google.");
    } catch (googleError) {
      setAuthError(googleError instanceof Error ? googleError.message : "Unknown error.");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSuccess("Signed out.");
  }

  /* ── Loading screen ── */
  if (isAuthenticating) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg, var(--accent), var(--accent-bright))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 20,
          color: "white",
          boxShadow: "0 4px 16px rgba(124,110,240,0.4)",
        }}>F</div>
        <p className="meta">Loading your account…</p>
      </div>
    );
  }

  /* ── Auth page ── */
  if (!user) {
    return (
      <main className="auth-shell">
        <div className="auth-layout">
          {/* Left copy */}
          <section className="auth-copy">
            <span className="eyebrow">Personal Finance</span>
            <h1>Track spending with confidence.</h1>
            <p>
              Create an account, continue with Google, or sign in with a one-time passcode
              to keep your expense history private and easy to trust.
            </p>
            <div className="auth-points">
              <div className="auth-point">
                <div className="auth-point-icon">🔒</div>
                <div className="auth-point-text">
                  <strong>Private by default</strong>
                  <span>Each account only sees its own records and totals.</span>
                </div>
              </div>
              <div className="auth-point">
                <div className="auth-point-icon">✉️</div>
                <div className="auth-point-text">
                  <strong>Email OTP verification</strong>
                  <span>Sign in with a one-time code — no passwords stored in plaintext.</span>
                </div>
              </div>
              <div className="auth-point">
                <div className="auth-point-icon">📊</div>
                <div className="auth-point-text">
                  <strong>Simple, clear review</strong>
                  <span>Filter, sort, and scan spending without clutter.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Auth card */}
          <aside className="card panel auth-card">
            {/* Brand mark inside card */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <div className="navbar-logo">F</div>
              <span className="navbar-name">Fenmo</span>
            </div>

            <div className="auth-card-top">
              <div>
                <span className="auth-kicker">
                  {otpState ? "Verification Step" : authMode === "register" ? "New Account" : "Welcome Back"}
                </span>
                <h2>
                  {otpState ? "Enter your OTP" : authMode === "register" ? "Create account" : "Sign in"}
                </h2>
              </div>
              {!otpState && (
                <div className="auth-switch">
                  <button
                    className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                    type="button"
                    onClick={() => { setAuthMode("login"); setAuthError(null); }}
                  >
                    Sign In
                  </button>
                  <button
                    className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                    type="button"
                    onClick={() => { setAuthMode("register"); setAuthError(null); }}
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {otpState ? (
              <form className="form-grid" onSubmit={handleOtpSubmit}>
                <div className="field">
                  <label htmlFor="auth-otp">Verification code</label>
                  <input
                    id="auth-otp"
                    inputMode="numeric"
                    placeholder="Enter the 6-digit OTP"
                    required
                    value={otpState.code}
                    onChange={(e) =>
                      setOtpState((cur) =>
                        cur ? { ...cur, code: e.target.value.replace(/\D/g, "").slice(0, 6) } : cur,
                      )
                    }
                  />
                </div>
                <p className="meta">We sent a one-time code to <strong style={{ color: "var(--text-secondary)" }}>{otpState.email}</strong>.</p>
                {otpState.developmentOtp && (
                  <p className="status success">Dev OTP: {otpState.developmentOtp}</p>
                )}
                <div className="submit-row">
                  <button className="button" type="submit" disabled={isSubmittingAuth}>
                    {isSubmittingAuth ? "Verifying…" : "Verify OTP"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => { setOtpState(null); setAuthError(null); }}
                  >
                    ← Back
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form className="form-grid" onSubmit={handleAuthSubmit}>
                  {authMode === "register" && (
                    <div className="field">
                      <label htmlFor="auth-name">Full name</label>
                      <input
                        id="auth-name"
                        required
                        placeholder="Jane Doe"
                        value={authForm.name}
                        onChange={(e) => setAuthForm((c) => ({ ...c, name: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="auth-email">Email address</label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm((c) => ({ ...c, email: e.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="auth-password">Password</label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm((c) => ({ ...c, password: e.target.value }))}
                    />
                  </div>
                  {authMode === "register" && (
                    <div className="field">
                      <label htmlFor="auth-confirm-password">Confirm password</label>
                      <input
                        id="auth-confirm-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authForm.confirmPassword}
                        onChange={(e) =>
                          setAuthForm((c) => ({ ...c, confirmPassword: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  <div className="submit-row">
                    <button className="button" type="submit" disabled={isSubmittingAuth}>
                      {isSubmittingAuth
                        ? authMode === "register" ? "Creating account…" : "Sending OTP…"
                        : authMode === "register" ? "Create Account" : "Continue with Email"}
                    </button>
                    <p className="meta" style={{ margin: 0, textAlign: "center" }}>
                      {authMode === "login"
                        ? "We verify email sign-in with a one-time code."
                        : "New accounts start with a clean, private expense history."}
                    </p>
                  </div>
                </form>

                <div className="auth-divider"><span>or</span></div>

                <div className="google-wrap">
                  <div ref={googleButtonRef} />
                  {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                    <p className="meta">Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google sign-in.</p>
                  )}
                  {isGoogleLoading && <p className="meta">Signing in with Google…</p>}
                </div>
              </>
            )}

            {authError && <p className="status error">{authError}</p>}
          </aside>
        </div>
      </main>
    );
  }

  /* ── Dashboard ── */
  return (
    <>
      {/* Sticky Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <div className="navbar-brand">
            <div className="navbar-logo">F</div>
            <span className="navbar-name">Fenmo</span>
          </div>

          {/* User + Sign Out */}
          <div className="navbar-user">
            <div className="navbar-avatar">{getInitials(user.name)}</div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.name}</span>
              <span className="navbar-user-email">{user.email}</span>
            </div>
            <div className="navbar-divider" />
            <button className="button danger-ghost" type="button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="shell">
        {/* Hero */}
        <section className="hero">
          <span className="eyebrow">Expense Tracker</span>
          <h1>Your spending, at a glance.</h1>
          <p>Record expenses, review where your money is going, and rely on safe retry-aware submission even on a messy network.</p>
        </section>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stat-card">
            <div className="stat-label">Visible Total</div>
            <div className="stat-value">{totalAmount}</div>
            <div className="stat-sub">{categoryFilter === "All" ? "All categories" : categoryFilter}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{count}</div>
            <div className="stat-sub">{count === 1 ? "expense" : "expenses"} found</div>
          </div>
        </div>

        {/* Two-col grid */}
        <section className="grid">
          {/* Add Expense panel */}
          <aside className="card panel">
            <div className="panel-header">
              <h2>Add Expense</h2>
              <p>Amounts stored in money-safe minor units and displayed in INR.</p>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="amount">Amount (₹)</label>
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="499.50"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
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
                  onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))}
                />
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Optional note about this expense…"
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                />
              </div>

              <div className="submit-row">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </form>

            {error && <p className="status error">{error}</p>}
            {success && <p className="status success">{success}</p>}
          </aside>

          {/* Expense History panel */}
          <section className="card panel">
            <div className="toolbar">
              <div className="panel-header" style={{ margin: 0 }}>
                <h2>Expense History</h2>
                <p>Sort and filter the list — totals reflect visible results.</p>
              </div>
            </div>

            <div className="toolbar-controls" style={{ marginBottom: "1.25rem" }}>
              <div className="field">
                <label htmlFor="filter-category">Category</label>
                <select
                  id="filter-category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All categories</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="sort-order">Sort by</label>
                <select
                  id="sort-order"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ExpenseSortOption)}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading && <p className="loading">Loading expenses…</p>}

            {!isLoading && expenses.length === 0 && (
              <p className="empty">No expenses match the current filters yet.</p>
            )}

            {!isLoading && expenses.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="amount">{expense.amount}</td>
                        <td>
                          <span className="category-badge">{expense.category}</span>
                        </td>
                        <td>{formatDate(expense.date)}</td>
                        <td>{expense.description || "—"}</td>
                        <td>{formatDateTime(expense.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

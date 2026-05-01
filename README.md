# Fenmo Expense Tracker

A minimal full-stack expense tracker built for a take-home assignment. It lets users add expenses, review the list, filter by category, sort by newest date, and see the total for the currently visible list.

## Tech Stack

- `Next.js` with the App Router for the frontend and API routes
- `TypeScript` for type safety across the stack
- `Prisma` as the database ORM
- `PostgreSQL` as the persistence layer for local and deployed environments
- `Vitest` for focused automated tests around correctness-sensitive logic

## Why This Persistence Choice

I chose PostgreSQL with Prisma because the assignment frames this as something that should feel maintainable over time rather than a throwaway prototype. PostgreSQL is reliable, production-ready, and a good fit for deployment on common hosted platforms used with Vercel.

## Key Design Decisions

- **Money is stored in minor units**: amounts are converted to paise and stored as integers (`amountMinor`) to avoid floating-point precision issues.
- **The API is retry-aware**: `POST /api/expenses` accepts an `idempotencyKey`. Repeated requests with the same key return the original expense instead of creating duplicates.
- **The server is the source of truth**: after a successful create, the UI re-fetches data from the API rather than assuming local state is enough.
- **The visible total matches the current view**: filtering changes both the list and the total amount so the UI stays consistent.

## API

### `POST /api/expenses`

Creates a new expense.

Request body:

```json
{
  "amount": "499.50",
  "category": "Food",
  "description": "Lunch",
  "date": "2025-01-15",
  "idempotencyKey": "a-unique-request-id"
}
```

### `GET /api/expenses`

Returns expenses, sorted by newest date first.

Optional query params:

- `category=Food`
- `sort=date_desc`

Example response shape:

```json
{
  "expenses": [],
  "totalAmount": "₹0.00",
  "totalAmountMinor": 0,
  "count": 0
}
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and set your Postgres connection string:

```bash
cp .env.example .env
```

3. Generate the Prisma client:

```bash
npx prisma generate
```

4. Push the schema to your database:

```bash
npx prisma db push
```

5. Run the app:

```bash
npm run dev
```

6. Run tests:

```bash
npm test
```

## Deploying

Recommended deployment target:

- Frontend and API: `Vercel`
- Database: hosted `PostgreSQL` such as Neon, Supabase, or Railway Postgres

Set `DATABASE_URL` in Vercel, then run a schema push or migration against the hosted database.

Live application link:

- `Add your deployed URL here`

## Trade-Offs Due To Timebox

- I kept the API surface intentionally small: only the two required endpoints are implemented.
- I prioritized retry-safety, money handling, and clear UI states over broader feature work.
- I used targeted service-level tests to cover correctness-sensitive behavior quickly and clearly.

## What I Intentionally Did Not Do

- No authentication or multi-user support
- No category summary dashboard
- No edit/delete expense flows
- No pagination because the current feature set is small
- No optimistic updates because correctness under retries mattered more here

## Nice-To-Have Features Included

- Validation for invalid and non-positive amounts
- Validation for required category and valid date
- Loading and error states in the UI
- Automated tests for idempotent create behavior and filtered totals

## AI Assistance Note

AI-assisted tooling was used to help scaffold, organize, and refine this submission. All implementation choices, code review, and final validation were manually directed to keep the result aligned with the assignment requirements.

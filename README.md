# Fenmo Expense Tracker

A minimal full-stack expense tracker built for a take-home assignment. It lets users create an account, sign in with email plus OTP verification or Google, add expenses, review only their own records, filter by category, sort by date or amount, and see the total for the currently visible list.

## Tech Stack

- `Next.js` with the App Router for the frontend and API routes
- `TypeScript` for type safety across the stack
- `Prisma` as the database ORM
- `PostgreSQL` as the persistence layer for local and deployed environments
- `Nodemailer` for optional OTP email delivery
- `Vitest` for focused automated tests around correctness-sensitive logic

## Why This Persistence Choice

I chose PostgreSQL with Prisma because the assignment frames this as something that should feel maintainable over time rather than a throwaway prototype. PostgreSQL is reliable, production-ready, and a good fit for deployment on common hosted platforms used with Vercel.

## Key Design Decisions

- **Money is stored in minor units**: amounts are converted to paise and stored as integers (`amountMinor`) to avoid floating-point precision issues.
- **The API is retry-aware per user**: `POST /api/expenses` accepts an `idempotencyKey`. Repeated requests with the same key for the same account return the original expense instead of creating duplicates.
- **Each account only sees its own records**: expenses are tied to a user account and all expense reads/writes are scoped to the signed-in user.
- **Auth supports local development gracefully**: when SMTP is not configured, OTP codes are returned in the response for local testing; with SMTP configured, the code is emailed instead.
- **The server is the source of truth**: after a successful create, the UI re-fetches data from the API rather than assuming local state is enough.
- **The visible total matches the current view**: filtering changes both the list and the total amount so the UI stays consistent.

## API

### `POST /api/auth/register`

Creates a new user account and sends an OTP for verification.

### `POST /api/auth/login/request-otp`

Validates email/password and sends a one-time passcode.

### `POST /api/auth/login/verify-otp`

Verifies the OTP and signs the user in.

### `POST /api/auth/google`

Signs the user in with a verified Google credential.

### `POST /api/auth/logout`

Signs the current user out.

### `GET /api/auth/session`

Returns the current signed-in user, if any.

### `POST /api/expenses`

Creates a new expense for the signed-in user.

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

Returns expenses for the current signed-in user.

Optional query params:

- `category=Food`
- `sort=date_desc`
- `sort=date_asc`
- `sort=amount_desc`
- `sort=amount_asc`

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

Auth and email settings:

- `GOOGLE_CLIENT_ID`: Google OAuth client ID used by the server to verify credentials.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: the same Google OAuth client ID exposed to the browser for the Google sign-in button.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: optional email settings for OTP delivery. If these are left blank, the API returns `developmentOtp` for local testing.

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

Recommended deployment target for this submission:

- Frontend and API: `Render` Web Service
- Database: `Render Postgres`

This repository includes a `render.yaml` blueprint that creates both the web service and Postgres database.

### Render Blueprint Deploy

1. Push the latest code to GitHub.
2. In Render, create a new Blueprint instance from this repository.
3. Render will use:

```bash
npm ci && npm run render-build
```

as the build command and:

```bash
npm run start
```

as the start command.

The Render start command runs `prisma db push` before `next start` so the deployed database schema is created automatically.

4. During setup, provide the secret environment variables when prompted:

- `GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

`DATABASE_URL` is wired automatically from the Render Postgres service. `SMTP_PORT` defaults to `587`.

If Google sign-in is enabled, add the deployed Render URL to the Google OAuth client's authorized JavaScript origins, for example:

```text
https://fenmo-expense-tracker.onrender.com
```

If SMTP is not configured, email/password auth still works for local development because the API returns `developmentOtp`. For a public deployed submission, SMTP should be configured so OTPs are emailed instead of exposed in the response.

Live application link:

- `Add your deployed URL here`

## Submission Checklist

- Include the GitHub repository link.
- Include the Render live application link.
- Mention that the app uses PostgreSQL with Prisma, account-scoped expenses, OTP email auth, optional Google sign-in, idempotent expense creation, filtering, sorting, and automated tests.
- Mention the validation commands used: `npm test` and `npm run build`.

## Trade-Offs Due To Timebox

- I kept expense management intentionally small: create and list are implemented, while edit/delete are left out.
- I prioritized account isolation, retry-safety, money handling, and clear UI states over broader reporting features.
- I used targeted service-level tests to cover correctness-sensitive behavior quickly and clearly.

## What I Intentionally Did Not Do

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

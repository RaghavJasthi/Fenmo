import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createExpense, listExpenses } from "@/lib/expense-service";
import { prismaExpenseRepository } from "@/lib/prisma-expense-repository";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const result = await listExpenses(prismaExpenseRepository, {
      userId: user.id,
      category: searchParams.get("category") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
    }
    const body = await request.json();
    const result = await createExpense(prismaExpenseRepository, {
      ...body,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Invalid request.",
        issues: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Unexpected server error." }, { status: 500 });
}

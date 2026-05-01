import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashOtpCode } from "@/lib/auth";
import { verifyOtpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.parse(body);

    const otpRequest = await prisma.otpRequest.findUnique({
      where: { id: parsed.otpRequestId },
      include: { user: true },
    });

    if (
      !otpRequest ||
      otpRequest.consumedAt ||
      otpRequest.expiresAt < new Date() ||
      otpRequest.codeHash !== hashOtpCode(parsed.otpCode)
    ) {
      return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 401 });
    }

    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    });

    await createSession(otpRequest.user.id);

    return NextResponse.json({
      user: {
        id: otpRequest.user.id,
        name: otpRequest.user.name,
        email: otpRequest.user.email,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ message: "Invalid request.", issues: error.flatten() }, { status: 400 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
  return NextResponse.json({ message: "Unexpected server error." }, { status: 500 });
}

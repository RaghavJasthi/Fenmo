import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtpCode, sendOtpEmail, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const otpCode = generateOtpCode();
    const otpRequest = await prisma.otpRequest.create({
      data: {
        email: user.email,
        codeHash: hashOtpCode(otpCode),
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10),
      },
    });

    const sent = await sendOtpEmail(user.email, otpCode);

    return NextResponse.json({
      otpRequestId: otpRequest.id,
      message: sent
        ? "OTP sent to your email."
        : "SMTP is not configured, so the OTP is shown for local development only.",
      developmentOtp: sent ? undefined : otpCode,
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

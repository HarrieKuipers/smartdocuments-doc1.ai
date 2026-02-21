import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-mailadres is verplicht." },
        { status: 400 }
      );
    }

    // TODO: Implement password reset with Resend
    // For now, always return success (don't leak user existence)
    return NextResponse.json({ message: "Resetlink verstuurd indien account bestaat." });
  } catch {
    return NextResponse.json(
      { error: "Er is een fout opgetreden." },
      { status: 500 }
    );
  }
}

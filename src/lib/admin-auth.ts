import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user?.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}

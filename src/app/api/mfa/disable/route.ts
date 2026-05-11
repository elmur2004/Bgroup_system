import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disableMfa } from "@/lib/mfa/totp";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await disableMfa(session.user.id);
  return NextResponse.json({ ok: true });
}

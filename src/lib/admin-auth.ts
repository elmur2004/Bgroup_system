import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requirePlatformAdmin(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const ok =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function requireAuthSession(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

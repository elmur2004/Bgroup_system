import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Decides whether to show the onboarding wizard for the current user.
 *
 * Surfaces only for users who:
 *   1. Haven't dismissed/finished it (User.onboardedAt is null), AND
 *   2. Are an HR super_admin (the only role that can productively complete the
 *      "create company / add employee / invite teammate" flow), AND
 *   3. The system has zero HR companies (true blank-slate signal).
 *
 * Anyone else gets `{ show: false }` and the wizard never renders.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ show: false });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) {
    return NextResponse.json({ show: false });
  }

  const isSuperAdmin = session.user.hrRoles?.includes("super_admin");
  if (!isSuperAdmin) {
    return NextResponse.json({ show: false });
  }

  const companyCount = await db.hrCompany.count();
  return NextResponse.json({
    show: companyCount === 0,
    state: { companyCount },
  });
}

export async function POST() {
  // Mark this user as onboarded (regardless of how far they got).
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db.user.update({
    where: { id: session.user.id },
    data: { onboardedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

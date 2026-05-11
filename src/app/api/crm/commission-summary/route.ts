import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { getSalesCommissionSummary } from "@/lib/crm/sales-commission";

/**
 * GET /api/crm/commission-summary
 * Returns the current user's sales commission summary, OR — when called by
 * a platform admin with ?userId=... — that user's summary. Reps see only
 * their own.
 */
export async function GET(req: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const requestedUserId = url.searchParams.get("userId");

  const isPlatformAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);

  const targetUserId =
    requestedUserId && (isPlatformAdmin || requestedUserId === session.user.id)
      ? requestedUserId
      : session.user.id;

  const summary = await getSalesCommissionSummary(targetUserId);
  if (!summary) {
    return NextResponse.json({ summary: null, message: "User has no CRM profile" });
  }
  return NextResponse.json({ summary });
}

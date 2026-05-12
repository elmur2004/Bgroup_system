import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/crm/commissions-payable
 *
 * Aggregates commissions accrued (closed-won opportunities) across every
 * sales rep, scoped to a calendar window. Used by the Accountant dashboard
 * to size the commission liability that needs to land in the upcoming
 * payroll run.
 *
 * Query params:
 *   ?month=5&year=2026  → that calendar month
 *   default              → current month
 *
 * Restricted to: platform admins (super_admin OR partners-admin without
 * partnerId), accountants, or anyone with the "ceo" HR role. Sales reps
 * see their own number via /api/crm/commission-summary.
 */
const DEFAULT_RATE = 0.05;

function canViewPayable(session: Session) {
  const r = session.user.hrRoles ?? [];
  if (r.includes("super_admin") || r.includes("accountant") || r.includes("ceo")) return true;
  if (session.user.modules?.includes("partners") && !session.user.partnerId) return true;
  return false;
}

export async function GET(req: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewPayable(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const month = Number(url.searchParams.get("month")) || now.getUTCMonth() + 1;
  const year = Number(url.searchParams.get("year")) || now.getUTCFullYear();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const wonInWindow = await db.crmOpportunity.findMany({
    where: {
      stage: "WON",
      dateClosed: { gte: start, lt: end },
    },
    select: {
      id: true,
      estimatedValueEGP: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  type RepEntry = {
    repId: string;
    repName: string;
    repEmail: string | null;
    userId: string | null;
    dealCount: number;
    wonValueEGP: number;
    commissionEGP: number;
  };
  const byRep = new Map<string, RepEntry>();
  let totalWon = 0;
  let totalCommission = 0;

  for (const opp of wonInWindow) {
    if (!opp.owner) continue;
    const v = Number(opp.estimatedValueEGP);
    totalWon += v;
    totalCommission += v * DEFAULT_RATE;
    const k = opp.owner.id;
    if (!byRep.has(k)) {
      byRep.set(k, {
        repId: opp.owner.id,
        repName: opp.owner.fullName,
        repEmail: opp.owner.user?.email ?? null,
        userId: opp.owner.userId,
        dealCount: 0,
        wonValueEGP: 0,
        commissionEGP: 0,
      });
    }
    const entry = byRep.get(k)!;
    entry.dealCount += 1;
    entry.wonValueEGP += v;
    entry.commissionEGP += v * DEFAULT_RATE;
  }

  return NextResponse.json({
    period: { month, year },
    commissionRate: DEFAULT_RATE,
    totals: {
      reps: byRep.size,
      dealCount: wonInWindow.length,
      wonValueEGP: totalWon,
      commissionEGP: totalCommission,
    },
    perRep: Array.from(byRep.values()).sort((a, b) => b.commissionEGP - a.commissionEGP),
  });
}

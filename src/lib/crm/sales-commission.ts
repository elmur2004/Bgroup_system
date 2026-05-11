import { db } from "@/lib/db";

/**
 * Per-rep commission summary. Sales reps are real HR employees — their
 * commissions accrue from CRM opportunities they own and that have moved
 * into the WON stage.
 *
 * Default commission rate is 5%; later this should be configurable on the
 * CrmUserProfile or on the product/service tiers.
 */

const DEFAULT_RATE = 0.05;

export type CommissionPeriodTotals = {
  count: number;
  wonValueEGP: number;
  commissionEGP: number;
};

export type CommissionSummary = {
  commissionRate: number;
  lifetime: CommissionPeriodTotals;
  thisMonth: CommissionPeriodTotals;
  thisYear: CommissionPeriodTotals;
  recentWins: Array<{
    id: string;
    code: string;
    title: string;
    valueEGP: number;
    commissionEGP: number;
    dateClosed: string | null;
    company: string;
  }>;
};

function startOfMonthUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfYearUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/**
 * Compute the commission summary for a user with a CrmUserProfile. Returns
 * null if the user has no CRM profile (i.e. not a sales rep).
 */
export async function getSalesCommissionSummary(userId: string): Promise<CommissionSummary | null> {
  const prof = await db.crmUserProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!prof) return null;

  const startMonth = startOfMonthUTC();
  const startYear = startOfYearUTC();

  const allWon = await db.crmOpportunity.findMany({
    where: { ownerId: prof.id, stage: "WON" },
    orderBy: { dateClosed: "desc" },
    select: {
      id: true,
      code: true,
      title: true,
      estimatedValueEGP: true,
      dateClosed: true,
      company: { select: { nameEn: true } },
    },
  });

  function bucket(rows: typeof allWon, since?: Date): CommissionPeriodTotals {
    const filtered = since
      ? rows.filter((r) => r.dateClosed && r.dateClosed >= since)
      : rows;
    const wonValueEGP = filtered.reduce((acc, r) => acc + Number(r.estimatedValueEGP), 0);
    return {
      count: filtered.length,
      wonValueEGP,
      commissionEGP: wonValueEGP * DEFAULT_RATE,
    };
  }

  return {
    commissionRate: DEFAULT_RATE,
    lifetime: bucket(allWon),
    thisMonth: bucket(allWon, startMonth),
    thisYear: bucket(allWon, startYear),
    recentWins: allWon.slice(0, 10).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      valueEGP: Number(r.estimatedValueEGP),
      commissionEGP: Number(r.estimatedValueEGP) * DEFAULT_RATE,
      dateClosed: r.dateClosed ? r.dateClosed.toISOString() : null,
      company: r.company?.nameEn ?? "—",
    })),
  };
}

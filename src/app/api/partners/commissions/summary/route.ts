import { db } from "@/lib/db";
import { requirePartnerAuth, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { PartnerCommissionStatus } from "@/generated/prisma";

// GET /api/partners/commissions/summary — Aggregated commission data
export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const where = user.isAdmin ? {} : { partnerId: user.partnerId! };

  // Total aggregation
  const totals = await db.partnerCommission.aggregate({
    where,
    _count: true,
    _sum: { amount: true },
  });

  // Per-status aggregation
  const statuses: PartnerCommissionStatus[] = ["PENDING", "APPROVED", "PAID"];
  const byStatus = await Promise.all(
    statuses.map(async (status) => {
      const agg = await db.partnerCommission.aggregate({
        where: { ...where, status },
        _count: true,
        _sum: { amount: true },
      });
      return {
        status,
        count: agg._count,
        totalAmount: agg._sum.amount ?? 0,
      };
    })
  );

  return jsonSuccess({
    totalCommissions: totals._count,
    totalAmount: totals._sum.amount ?? 0,
    byStatus,
  });
}

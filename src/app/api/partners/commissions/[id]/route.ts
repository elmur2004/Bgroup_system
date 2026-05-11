import { db } from "@/lib/db";
import { requirePartnerAuth, assertAccess, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { NextRequest } from "next/server";

// GET /api/partners/commissions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const { id } = await params;
  const commission = await db.partnerCommission.findUnique({
    where: { id },
    include: {
      deal: {
        select: {
          id: true,
          value: true,
          client: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true } },
        },
      },
      partner: {
        select: {
          id: true,
          companyName: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!commission || !assertAccess(user, commission.partnerId)) {
    return jsonError("Commission not found", 404);
  }

  return jsonSuccess(commission);
}

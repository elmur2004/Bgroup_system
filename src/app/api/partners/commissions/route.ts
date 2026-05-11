import { db } from "@/lib/db";
import { requirePartnerAuth, getPaginationParams, jsonPaginated, jsonError } from "@/lib/partners/helpers";
import { PartnerCommissionStatus } from "@/generated/prisma";
import { NextRequest } from "next/server";

// GET /api/partners/commissions — List commissions with optional filters
export async function GET(request: NextRequest) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const pagination = getPaginationParams(searchParams);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (user.isAdmin) {
    // Admin can filter by partnerId
    const partnerIdFilter = searchParams.get("partnerId");
    if (partnerIdFilter) where.partnerId = partnerIdFilter;
  } else {
    where.partnerId = user.partnerId!;
  }

  // Optional status filter
  const statusFilter = searchParams.get("status");
  if (statusFilter && Object.values(PartnerCommissionStatus).includes(statusFilter as PartnerCommissionStatus)) {
    where.status = statusFilter;
  }

  const [data, total] = await Promise.all([
    db.partnerCommission.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          select: {
            id: true,
            value: true,
            client: { select: { id: true, name: true } },
            service: { select: { id: true, name: true } },
          },
        },
        partner: { select: { id: true, companyName: true } },
      },
    }),
    db.partnerCommission.count({ where }),
  ]);

  return jsonPaginated(data, total, pagination);
}

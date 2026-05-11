import { db } from "@/lib/db";
import { requirePartnerAuth, getPaginationParams, jsonPaginated, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { requestContractSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// GET /api/partners/contracts — List contracts (admin: all, partner: own)
export async function GET(request: NextRequest) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const pagination = getPaginationParams(request.nextUrl.searchParams);
  const where = user.isAdmin ? {} : { partnerId: user.partnerId! };

  const [data, total] = await Promise.all([
    db.partnerContract.findMany({
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
      },
    }),
    db.partnerContract.count({ where }),
  ]);

  return jsonPaginated(data, total, pagination);
}

// POST /api/partners/contracts — Partner: request contract for a WON deal
export async function POST(request: NextRequest) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  if (!user.partnerId) {
    return jsonError("Partner profile required", 403);
  }

  const body = await request.json();
  const parsed = requestContractSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const deal = await db.partnerDeal.findUnique({ where: { id: parsed.data.dealId } });
  if (!deal || deal.partnerId !== user.partnerId) {
    return jsonError("Deal not found", 404);
  }

  if (deal.status !== "WON") {
    return jsonError("Contracts can only be requested for won deals", 400);
  }

  const contract = await db.partnerContract.create({
    data: {
      partnerId: user.partnerId,
      dealId: deal.id,
    },
    include: {
      deal: {
        select: {
          id: true,
          value: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  return jsonSuccess(contract, 201);
}

import { db } from "@/lib/db";
import { requireAdmin, jsonSuccess, jsonError, writePartnerAudit } from "@/lib/partners/helpers";
import { updateCommissionStatusSchema } from "@/lib/partners/validations";
import { PartnerCommissionStatus } from "@/generated/prisma";
import { NextRequest } from "next/server";
import { dispatchTrigger } from "@/lib/workflows/engine";

// State machine: valid transitions
const VALID_TRANSITIONS: Record<PartnerCommissionStatus, PartnerCommissionStatus[]> = {
  PENDING: ["APPROVED"],
  APPROVED: ["PAID"],
  PAID: [],
};

// PATCH /api/partners/commissions/[id]/status — Admin: update commission status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateCommissionStatusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const commission = await db.partnerCommission.findUnique({ where: { id } });
  if (!commission) return jsonError("Commission not found", 404);

  const allowedNext = VALID_TRANSITIONS[commission.status];
  if (!allowedNext.includes(parsed.data.status)) {
    return jsonError(
      `Cannot transition from ${commission.status} to ${parsed.data.status}`,
      400
    );
  }

  const data: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "APPROVED") data.approvedAt = new Date();
  if (parsed.data.status === "PAID") data.paidAt = new Date();

  const updated = await db.partnerCommission.update({
    where: { id },
    data,
    include: {
      deal: { select: { id: true, value: true } },
      partner: { select: { id: true, companyName: true } },
    },
  });

  await writePartnerAudit({
    userId: user.userId,
    action: `commission.status.${parsed.data.status.toLowerCase()}`,
    entity: "PartnerCommission",
    entityId: id,
    oldData: { status: commission.status },
    newData: { status: parsed.data.status },
    request,
  });

  // Fire workflows that subscribe to PartnerCommission updates.
  void dispatchTrigger({
    kind: "ENTITY_UPDATED",
    entity: "PartnerCommission",
    payload: {
      id,
      status: parsed.data.status,
      previousStatus: commission.status,
      partnerId: commission.partnerId,
    },
  });

  return jsonSuccess(updated);
}

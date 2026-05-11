import { db } from "@/lib/db";
import { requireAdmin, jsonSuccess, jsonError, writePartnerAudit } from "@/lib/partners/helpers";
import { reviewContractSchema } from "@/lib/partners/validations";
import { publish } from "@/lib/events/bus";
import { NextRequest } from "next/server";

// PATCH /api/partners/contracts/[id]/review — Admin: approve/reject contract
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewContractSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const contract = await db.partnerContract.findUnique({ where: { id } });
  if (!contract) return jsonError("Contract not found", 404);

  if (contract.status !== "REQUESTED") {
    return jsonError("Only requested contracts can be reviewed", 400);
  }

  const { action, rejectionReason } = parsed.data;

  if (action === "REJECTED" && !rejectionReason) {
    return jsonError("Rejection reason is required", 400);
  }

  const updated = await db.partnerContract.update({
    where: { id },
    data: {
      status: action,
      reviewedAt: new Date(),
      reviewedBy: user.userId,
      rejectionReason: action === "APPROVED" ? null : rejectionReason,
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

  await writePartnerAudit({
    userId: user.userId,
    action: `contract.${action === "APPROVED" ? "approve" : "reject"}`,
    entity: "PartnerContract",
    entityId: id,
    oldData: { status: contract.status },
    newData: { status: action, rejectionReason: rejectionReason ?? null },
    request,
  });

  // Notify the contract's owner (the partner who requested it).
  try {
    const profile = await db.partnerProfile.findUnique({
      where: { id: contract.partnerId },
      select: { userId: true },
    });
    if (profile?.userId) {
      const title =
        action === "APPROVED" ? "Contract approved" : "Contract rejected";
      const message =
        action === "APPROVED"
          ? `Your contract request has been approved.`
          : `Your contract request was rejected: ${rejectionReason ?? "no reason given"}`;
      const notif = await db.partnerNotification.create({
        data: {
          userId: profile.userId,
          type: action === "APPROVED" ? "CONTRACT_APPROVED" : "CONTRACT_REJECTED",
          title,
          message,
          metadata: { contractId: id, dealId: contract.dealId },
        },
      });
      publish({
        type: "notification.created",
        userId: profile.userId,
        payload: { id: notif.id, module: "partners", title, message },
      });
    }
  } catch (e) {
    console.error("Failed to notify partner of contract review:", e);
  }

  return jsonSuccess(updated);
}

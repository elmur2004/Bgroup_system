import { db } from "@/lib/db";
import { requireAdmin, jsonSuccess, jsonError, writePartnerAudit } from "@/lib/partners/helpers";
import { reviewInvoiceSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// PATCH /api/partners/invoices/[id]/review — Admin: approve/reject invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const invoice = await db.partnerInvoice.findUnique({ where: { id } });
  if (!invoice) return jsonError("Invoice not found", 404);

  if (invoice.status !== "REQUESTED") {
    return jsonError("Only requested invoices can be reviewed", 400);
  }

  const { action, rejectionReason } = parsed.data;

  if (action === "REJECTED" && !rejectionReason) {
    return jsonError("Rejection reason is required", 400);
  }

  const updated = await db.partnerInvoice.update({
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
    action: `invoice.${action === "APPROVED" ? "approve" : "reject"}`,
    entity: "PartnerInvoice",
    entityId: id,
    oldData: { status: invoice.status },
    newData: { status: action, rejectionReason: rejectionReason ?? null },
    request,
  });

  return jsonSuccess(updated);
}

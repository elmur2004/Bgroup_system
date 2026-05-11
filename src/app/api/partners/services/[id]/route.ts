import { db } from "@/lib/db";
import { requirePartnerAuth, requireAdmin, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { updateServiceSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// GET /api/partners/services/[id] — Any authenticated: get service
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requirePartnerAuth();
  if (error) return error;

  const { id } = await params;
  const service = await db.partnerService.findUnique({ where: { id } });
  if (!service) return jsonError("Service not found", 404);
  return jsonSuccess(service);
}

// PATCH /api/partners/services/[id] — Admin: update service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const existing = await db.partnerService.findUnique({ where: { id } });
  if (!existing) return jsonError("Service not found", 404);

  const updated = await db.partnerService.update({
    where: { id },
    data: parsed.data,
  });

  return jsonSuccess(updated);
}

// DELETE /api/partners/services/[id] — Admin: soft-delete service
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const existing = await db.partnerService.findUnique({ where: { id } });
  if (!existing) return jsonError("Service not found", 404);

  await db.partnerService.update({
    where: { id },
    data: { isActive: false },
  });

  return jsonSuccess({ message: "Service deactivated" });
}

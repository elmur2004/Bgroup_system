import { db } from "@/lib/db";
import { requireAdmin, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { updatePartnerSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// GET /api/partners/partners/[id] — Admin: get partner by id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const partner = await db.partnerProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!partner) return jsonError("Partner not found", 404);
  return jsonSuccess(partner);
}

// PATCH /api/partners/partners/[id] — Admin: update partner
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updatePartnerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const existing = await db.partnerProfile.findUnique({ where: { id } });
  if (!existing) return jsonError("Partner not found", 404);

  const updated = await db.partnerProfile.update({
    where: { id },
    data: parsed.data,
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return jsonSuccess(updated);
}

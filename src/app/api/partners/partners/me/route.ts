import { db } from "@/lib/db";
import { requirePartnerAuth, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { updateMyProfileSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// GET /api/partners/partners/me — Partner: get own profile
export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  if (!user.partnerId) {
    return jsonError("Partner profile not found", 404);
  }

  const partner = await db.partnerProfile.findUnique({
    where: { id: user.partnerId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!partner) return jsonError("Partner not found", 404);
  return jsonSuccess(partner);
}

// PATCH /api/partners/partners/me — Partner: update own profile
export async function PATCH(request: NextRequest) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  if (!user.partnerId) {
    return jsonError("Partner profile not found", 404);
  }

  const body = await request.json();
  const parsed = updateMyProfileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const { name, companyName, contactPhone } = parsed.data;

  const result = await db.$transaction(async (tx) => {
    if (name) {
      await tx.user.update({
        where: { id: user.userId },
        data: { name },
      });
    }

    const updated = await tx.partnerProfile.update({
      where: { id: user.partnerId! },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(contactPhone !== undefined && { contactPhone }),
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return updated;
  });

  return jsonSuccess(result);
}

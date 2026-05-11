import { db } from "@/lib/db";
import { requirePartnerAuth, assertAccess, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { convertLeadSchema } from "@/lib/partners/validations";
import { NextRequest } from "next/server";

// POST /api/partners/leads/[id]/convert — Convert lead to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const { id } = await params;
  const lead = await db.partnerLead.findUnique({ where: { id } });
  if (!lead || !assertAccess(user, lead.partnerId)) {
    return jsonError("Lead not found", 404);
  }

  if (lead.convertedToClientId) {
    return jsonError("Lead already converted", 400);
  }

  const body = await request.json();
  const parsed = convertLeadSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const client = await db.$transaction(async (tx) => {
    const newClient = await tx.partnerClient.create({
      data: {
        partnerId: lead.partnerId,
        name: parsed.data.name || lead.name,
        email: parsed.data.email || lead.email,
        phone: parsed.data.phone || lead.phone,
        company: parsed.data.company || lead.company,
      },
    });

    await tx.partnerLead.update({
      where: { id },
      data: {
        status: "QUALIFIED",
        convertedToClientId: newClient.id,
      },
    });

    return newClient;
  });

  return jsonSuccess(client, 201);
}

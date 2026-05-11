import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requirePartnerAuth, jsonError, jsonSuccess } from "@/lib/partners/helpers";

const createSchema = z.object({
  campaign: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  amount: z.number().positive(),
});

export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  const where = user.partnerId ? { partnerId: user.partnerId } : {};
  const requests = await db.partnerMdfRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return jsonSuccess(requests);
}

export async function POST(req: Request) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) {
    return jsonError("Only partners can submit MDF requests", 403);
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const created = await db.partnerMdfRequest.create({
    data: {
      partnerId: user.partnerId,
      campaign: parsed.data.campaign,
      description: parsed.data.description,
      amount: parsed.data.amount,
      status: "SUBMITTED",
    },
  });
  return jsonSuccess(created, 201);
}

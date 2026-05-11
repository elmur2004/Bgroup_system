import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAdmin, jsonSuccess, jsonError } from "@/lib/partners/helpers";

const createSchema = z.object({
  partnerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).optional().default("USD"),
  scheduledFor: z.string().datetime(),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const payouts = await db.partnerPayout.findMany({
    orderBy: { scheduledFor: "desc" },
    take: 200,
    include: { partner: { select: { companyName: true } } },
  });
  return jsonSuccess(payouts);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);
  const payout = await db.partnerPayout.create({
    data: {
      partnerId: parsed.data.partnerId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      scheduledFor: new Date(parsed.data.scheduledFor),
      status: "SCHEDULED",
    },
  });
  return jsonSuccess(payout, 201);
}

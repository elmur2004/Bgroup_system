import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requirePartnerAuth, jsonError, jsonSuccess } from "@/lib/partners/helpers";

const upsertSchema = z.object({
  subdomain: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(40)
    .optional()
    .nullable(),
  customDomain: z.string().max(120).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  supportEmail: z.email().optional().nullable(),
  customCtaText: z.string().max(80).optional().nullable(),
});

export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) return jsonError("No partner profile", 404);
  const branding = await db.partnerBranding.findUnique({
    where: { partnerId: user.partnerId },
  });
  return jsonSuccess(branding);
}

export async function PUT(req: Request) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) return jsonError("No partner profile", 404);

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const branding = await db.partnerBranding.upsert({
    where: { partnerId: user.partnerId },
    create: { partnerId: user.partnerId, ...parsed.data },
    update: parsed.data,
  });
  return jsonSuccess(branding);
}

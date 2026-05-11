import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createHash } from "node:crypto";
import { requirePartnerAuth, jsonError, jsonSuccess } from "@/lib/partners/helpers";

const createSchema = z.object({
  prospectName: z.string().trim().min(1).max(200),
  prospectDomain: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Invalid domain")
    .transform((s) => s.toLowerCase()),
});

const REGISTRATION_LOCK_DAYS = 90;

function hashDomain(domain: string): string {
  return createHash("sha256").update(domain.toLowerCase()).digest("hex");
}

export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  const where = user.partnerId ? { partnerId: user.partnerId } : {};
  const registrations = await db.partnerDealRegistration.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return jsonSuccess(registrations);
}

export async function POST(req: Request) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) {
    return jsonError("Only partners can register deals", 403);
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  const domainHash = hashDomain(parsed.data.prospectDomain);

  // Conflict detection: any active registration for this domain in the last
  // window? Or an existing client?
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REGISTRATION_LOCK_DAYS);

  const conflictingRegistration = await db.partnerDealRegistration.findFirst({
    where: {
      domainHash,
      status: "APPROVED",
      createdAt: { gte: cutoff },
      partnerId: { not: user.partnerId },
    },
    select: { id: true },
  });

  // We don't have an explicit `domain` field on PartnerClient, so this is a
  // soft check on company name match.
  const conflictingClient = await db.partnerClient.findFirst({
    where: { company: { contains: parsed.data.prospectDomain.split(".")[0], mode: "insensitive" } },
    select: { id: true },
  });

  // Self-duplicate: this partner already registered the same domain. Return
  // a clean 409 instead of letting Prisma's P2002 unique-constraint error
  // bubble up as a 500.
  const ownPriorRegistration = await db.partnerDealRegistration.findUnique({
    where: {
      partnerId_prospectDomain: {
        partnerId: user.partnerId,
        prospectDomain: parsed.data.prospectDomain,
      },
    },
    select: { id: true, status: true },
  });
  if (ownPriorRegistration) {
    return jsonError(
      `You've already registered ${parsed.data.prospectDomain} (status: ${ownPriorRegistration.status})`,
      409
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REGISTRATION_LOCK_DAYS);

  const registration = await db.partnerDealRegistration.create({
    data: {
      partnerId: user.partnerId,
      prospectName: parsed.data.prospectName,
      prospectDomain: parsed.data.prospectDomain,
      domainHash,
      status: conflictingRegistration ? "REJECTED" : "PENDING",
      conflictWith: conflictingRegistration?.id ?? conflictingClient?.id ?? null,
      rejectionReason: conflictingRegistration
        ? "Another partner has an active registration for this prospect"
        : null,
      expiresAt: conflictingRegistration ? null : expiresAt,
    },
  });

  return jsonSuccess(registration, 201);
}

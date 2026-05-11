import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { createHash } from "node:crypto";
import { requirePartnerAuth, jsonError, jsonSuccess } from "@/lib/partners/helpers";

const uploadSchema = z.object({
  domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)).min(1).max(2000),
});

function hashDomain(d: string): string {
  return createHash("sha256").update(d.toLowerCase()).digest("hex");
}

export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) return jsonError("No partner profile", 404);
  const list = await db.partnerAccountList.findMany({
    where: { partnerId: user.partnerId },
    orderBy: { addedAt: "desc" },
    take: 500,
    select: { id: true, domain: true, addedAt: true },
  });
  return jsonSuccess(list);
}

/** Bulk-upload a partner's account list. Replaces existing entries by domain. */
export async function POST(req: Request) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;
  if (!user.partnerId) return jsonError("No partner profile", 404);

  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.issues[0].message, 400);

  const rows = parsed.data.domains.map((d) => ({
    partnerId: user.partnerId!,
    domain: d.toLowerCase(),
    domainHash: hashDomain(d),
  }));

  // Upsert per row.
  for (const r of rows) {
    await db.partnerAccountList.upsert({
      where: { partnerId_domain: { partnerId: r.partnerId, domain: r.domain } },
      create: r,
      update: { domainHash: r.domainHash },
    });
  }

  return jsonSuccess({ added: rows.length });
}

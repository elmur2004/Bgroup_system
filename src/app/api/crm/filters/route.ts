import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Returns the option lists for the global CRM filter bar: companies, sales
 * reps, products. Used by the dashboard and pipeline pages.
 */
export async function GET() {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [companies, reps, products] = await Promise.all([
    db.crmCompany.findMany({
      select: { id: true, nameEn: true },
      orderBy: { nameEn: "asc" },
      take: 500,
    }),
    db.crmUserProfile.findMany({
      where: { active: true },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    db.crmProduct.findMany({
      where: { active: true },
      select: { id: true, nameEn: true, code: true },
      orderBy: { nameEn: "asc" },
    }),
  ]);
  return NextResponse.json({ companies, reps, products });
}

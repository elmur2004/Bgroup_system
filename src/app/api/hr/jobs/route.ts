import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60),
  title: z.string().trim().min(1).max(200),
  description: z.string().min(1),
  companyId: z.string().min(1),
  departmentId: z.string().optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional().default("DRAFT"),
});

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const jobs = await db.job.findMany({
      where: status ? { status: status as "DRAFT" | "OPEN" | "CLOSED" } : {},
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth(req);
    if (!isHROrAdmin(authUser)) {
      return NextResponse.json({ detail: "Permission denied." }, { status: 403 });
    }
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 });
    }
    const job = await db.job.create({ data: parsed.data });
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

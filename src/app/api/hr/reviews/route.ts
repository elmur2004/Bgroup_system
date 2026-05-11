import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";

const createCycleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(req: Request) {
  try {
    const authUser = await requireAuth(req);
    if (!isHROrAdmin(authUser)) {
      // Non-admin sees only their own reviews.
      const ownEmp = await db.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      });
      if (!ownEmp) return NextResponse.json({ cycles: [], reviews: [] });
      const reviews = await db.hrReview.findMany({
        where: { OR: [{ subjectId: ownEmp.id }, { reviewerId: authUser.id }] },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ cycles: [], reviews });
    }
    const cycles = await db.hrReviewCycle.findMany({ orderBy: { startDate: "desc" } });
    return NextResponse.json({ cycles });
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
    const parsed = createCycleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 });
    }
    const cycle = await db.hrReviewCycle.create({
      data: {
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });
    return NextResponse.json({ cycle }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

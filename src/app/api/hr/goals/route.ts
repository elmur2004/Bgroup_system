import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";

const createSchema = z.object({
  employeeId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  dueDate: z.string().datetime().optional(),
  progressPct: z.number().int().min(0).max(100).optional().default(0),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(["ACTIVE", "ACHIEVED", "ABANDONED"]).optional(),
});

export async function GET(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employeeId");

    // Non-HR users can only see their own goals.
    if (!isHROrAdmin(authUser)) {
      const ownEmp = await db.hrEmployee.findUnique({
        where: { userId: authUser.id },
        select: { id: true },
      });
      if (!ownEmp) return NextResponse.json({ goals: [] });
      const goals = await db.hrGoal.findMany({
        where: { employeeId: ownEmp.id },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ goals });
    }

    const goals = await db.hrGoal.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ goals });
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
    const goal = await db.hrGoal.create({
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
    });
    return NextResponse.json({ goal }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

// Used as a typed export so [id]/route.ts can import.
export const _typedUpdateSchema = updateSchema;

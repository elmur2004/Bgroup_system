import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";

const createSchema = z.object({
  toEmployeeId: z.string().min(1),
  kind: z.enum(["kudos", "constructive"]),
  message: z.string().trim().min(1).max(2000),
  visibility: z.enum(["private", "manager", "team"]).optional().default("private"),
});

export async function GET(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const url = new URL(req.url);
    const employeeId = url.searchParams.get("employeeId");
    const where = employeeId
      ? { toEmployeeId: employeeId }
      : { fromUserId: authUser.id };
    const feedback = await db.hrFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ feedback });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await requireAuth(req);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ detail: parsed.error.issues[0].message }, { status: 400 });
    }
    const feedback = await db.hrFeedback.create({
      data: { ...parsed.data, fromUserId: authUser.id },
    });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

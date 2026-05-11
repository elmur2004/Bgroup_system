import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requireAuth } from "@/lib/hr/auth-utils";
import { isHROrAdmin } from "@/lib/hr/permissions";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  questions: z.array(z.object({ id: z.string(), text: z.string(), kind: z.string() })).min(1),
  isAnonymous: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  try {
    await requireAuth(req);
    const surveys = await db.hrSurvey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ surveys });
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
    const survey = await db.hrSurvey.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        questions: parsed.data.questions as object,
        isAnonymous: parsed.data.isAnonymous,
      },
    });
    return NextResponse.json({ survey }, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ detail: "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  handle: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "handle must be lowercase letters, numbers, hyphens"),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  durationMin: z.number().int().min(5).max(480).optional().default(30),
  bufferMin: z.number().int().min(0).max(120).optional().default(0),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const page = await db.bookingPage.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ page });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Each user owns one booking page; upsert.
  const page = await db.bookingPage.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ page }, { status: 201 });
}

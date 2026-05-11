import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createOnboardingChecklist } from "@/lib/onboarding/templates";

function isHrAdmin(session: Session) {
  return (
    !!session.user.hrRoles?.includes("super_admin") ||
    !!session.user.hrRoles?.includes("hr_manager")
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Detect whether an onboarding parent task already exists for this employee.
  const existing = await db.task.findFirst({
    where: {
      entityType: "HR_EMPLOYEE",
      entityId: id,
      type: "ONBOARDING",
      parentId: null,
    },
    select: { id: true, createdAt: true, status: true },
  });
  return NextResponse.json({ exists: !!existing, parent: existing });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isHrAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotent: if a parent already exists, return it instead of duplicating.
  const existing = await db.task.findFirst({
    where: {
      entityType: "HR_EMPLOYEE",
      entityId: id,
      type: "ONBOARDING",
      parentId: null,
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Onboarding checklist already exists", parentId: existing.id },
      { status: 409 }
    );
  }

  // Optional templateId in body — falls back to the active default template,
  // then to the hardcoded checklist if no template is configured.
  const body = await req.json().catch(() => ({}));
  const templateId = typeof body?.templateId === "string" ? body.templateId : undefined;

  try {
    const result = await createOnboardingChecklist(id, session.user.id, undefined, templateId);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create checklist";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

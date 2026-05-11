import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isPlatformAdmin(session: Session) {
  return (
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId)
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const comment = await db.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { select: { id: true, assigneeId: true, createdById: true } } },
  });
  if (!comment || comment.taskId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Author can delete their own comment; platform admins can delete any.
  const canDelete = comment.authorId === session.user.id || isPlatformAdmin(session);
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.taskComment.delete({ where: { id: commentId } });
  return NextResponse.json({ success: true });
}

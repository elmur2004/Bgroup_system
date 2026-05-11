import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

/**
 * Calendar feed for /tasks/calendar — returns the user's tasks (or all, for
 * platform admins) bucketed by `dueAt` within an inclusive date window.
 *
 * Query params:
 *   from=YYYY-MM-DD   (required) start of window, inclusive
 *   to=YYYY-MM-DD     (required) end of window, inclusive
 *   scope=mine|all    (default mine; "all" honoured only for platform admins)
 */
export async function GET(req: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required (YYYY-MM-DD)" }, { status: 400 });
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (end.getTime() - start.getTime() > 1000 * 60 * 60 * 24 * 366) {
    return NextResponse.json({ error: "Window too large (max 366 days)" }, { status: 400 });
  }

  const scope = url.searchParams.get("scope") ?? "mine";
  const isPlatformAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);

  const where: Prisma.TaskWhereInput = {
    dueAt: { gte: start, lte: end },
  };
  if (scope !== "all" || !isPlatformAdmin) {
    where.assigneeId = session.user.id;
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: { dueAt: "asc" },
    select: {
      id: true,
      title: true,
      dueAt: true,
      priority: true,
      status: true,
      type: true,
      module: true,
      entityType: true,
      entityId: true,
    },
    take: 1000,
  });

  return NextResponse.json({ tasks });
}

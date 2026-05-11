import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSubordinateEmployeeIds } from "@/lib/hr/subordinates";

/**
 * GET /api/hr/subordinates
 * Returns the set of employees who report (directly or indirectly) to the
 * current user. Used by team-lead surfaces — any employee with subordinates
 * automatically sees them, no role flag required.
 *
 * Optional ?userId=<id> — platform admins can scope to another user.
 */
export async function GET(req: Request) {
  const session = (await auth()) as Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const requested = url.searchParams.get("userId");

  const isPlatformAdmin =
    !!session.user.hrRoles?.includes("super_admin") ||
    (!!session.user.modules?.includes("partners") && !session.user.partnerId);

  const targetUserId = requested && isPlatformAdmin ? requested : session.user.id;

  // Resolve the target user's HrEmployee record; without one, they manage no-one.
  const me = await db.hrEmployee.findFirst({
    where: { userId: targetUserId },
    select: { id: true },
  });
  if (!me) return NextResponse.json({ subordinates: [], total: 0 });

  const empIds = Array.from(await getSubordinateEmployeeIds(me.id));
  if (empIds.length === 0) {
    return NextResponse.json({ subordinates: [], total: 0 });
  }

  const subordinates = await db.hrEmployee.findMany({
    where: { id: { in: empIds } },
    select: {
      id: true,
      employeeId: true,
      fullNameEn: true,
      positionEn: true,
      status: true,
      userId: true,
      directManagerId: true,
      directManager: { select: { id: true, fullNameEn: true } },
      department: { select: { id: true, nameEn: true } },
      company: { select: { id: true, nameEn: true } },
    },
    orderBy: { fullNameEn: "asc" },
  });

  return NextResponse.json({ subordinates, total: subordinates.length });
}

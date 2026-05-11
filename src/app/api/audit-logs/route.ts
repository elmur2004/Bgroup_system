import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

export type UnifiedAuditEntry = {
  id: string;
  module: "hr" | "partners";
  userId: string | null;
  userLabel: string | null;
  action: string;
  entity: string;
  entityId: string;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress: string | null;
  timestamp: string;
};

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only platform-level admins can browse all audit logs.
  const hrSuperAdmin = session.user.hrRoles?.includes("super_admin");
  const partnersAdmin =
    session.user.modules?.includes("partners") && !session.user.partnerId;
  if (!hrSuperAdmin && !partnersAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const moduleFilter = url.searchParams.get("module") as "hr" | "partners" | null;
  const entityFilter = url.searchParams.get("entity");
  const userFilter = url.searchParams.get("userId");
  const actionFilter = url.searchParams.get("action");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));

  const dateRange =
    startDate || endDate
      ? {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? endOfDay(endDate) : undefined,
        }
      : undefined;

  const tasks: Promise<UnifiedAuditEntry[]>[] = [];

  if ((!moduleFilter || moduleFilter === "hr") && hrSuperAdmin) {
    const where: Prisma.HrAuditLogWhereInput = {};
    if (entityFilter) where.entityType = entityFilter;
    if (userFilter) where.userId = userFilter;
    if (actionFilter) where.action = actionFilter;
    if (dateRange) where.timestamp = dateRange;

    tasks.push(
      db.hrAuditLog
        .findMany({
          where,
          orderBy: { timestamp: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { user: { include: { user: { select: { email: true } } } } },
        })
        .then((rows) =>
          rows.map<UnifiedAuditEntry>((r) => ({
            id: r.id,
            module: "hr",
            userId: r.userId,
            userLabel: r.user?.user?.email ?? null,
            action: r.action,
            entity: r.entityType,
            entityId: r.entityId,
            fieldName: r.fieldName || undefined,
            oldValue: r.oldValue,
            newValue: r.newValue,
            ipAddress: r.ipAddress,
            timestamp: r.timestamp.toISOString(),
          }))
        )
    );
  }

  if ((!moduleFilter || moduleFilter === "partners") && partnersAdmin) {
    const where: Prisma.PartnerAuditLogWhereInput = {};
    if (entityFilter) where.entity = entityFilter;
    if (userFilter) where.userId = userFilter;
    if (actionFilter) where.action = actionFilter;
    if (dateRange) where.createdAt = dateRange;

    tasks.push(
      db.partnerAuditLog
        .findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        })
        .then(async (rows) => {
          const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
          const users = userIds.length
            ? await db.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, email: true },
              })
            : [];
          const emailById = new Map(users.map((u) => [u.id, u.email]));
          return rows.map<UnifiedAuditEntry>((r) => ({
            id: r.id,
            module: "partners",
            userId: r.userId,
            userLabel: emailById.get(r.userId) ?? null,
            action: r.action,
            entity: r.entity,
            entityId: r.entityId,
            oldValue: r.oldData ? JSON.stringify(r.oldData) : null,
            newValue: r.newData ? JSON.stringify(r.newData) : null,
            ipAddress: r.ipAddress,
            timestamp: r.createdAt.toISOString(),
          }));
        })
    );
  }

  const buckets = await Promise.all(tasks);
  const all = buckets
    .flat()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, PAGE_SIZE);

  return NextResponse.json({
    entries: all,
    page,
    pageSize: PAGE_SIZE,
  });
}

function endOfDay(s: string): Date {
  const d = new Date(s);
  d.setHours(23, 59, 59, 999);
  return d;
}

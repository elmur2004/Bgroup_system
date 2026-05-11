import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type OrgNode = {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  email: string | null;
  photo: string | null;
  companyId: string;
  departmentId: string | null;
  directManagerId: string | null;
  reports: OrgNode[];
};

/**
 * Returns the company's reporting tree.
 *
 * Filters: ?companyId=...&departmentId=...
 *
 * Auth: any HR-module member can view; non-admins are restricted to their own
 * companies (via session.hrCompanies).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.modules?.includes("hr")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");
  const departmentId = url.searchParams.get("departmentId");

  const isCrossCompanyRole =
    session.user.hrRoles?.includes("super_admin") ||
    session.user.hrRoles?.includes("ceo");
  const allowedCompanies = session.user.hrCompanies ?? [];

  // Filter by company. If a specific company is requested, validate access.
  // Otherwise scope to the user's companies (or all, for super_admin/ceo).
  const where: { status: { in: string[] }; companyId?: string | { in: string[] }; departmentId?: string } = {
    status: { in: ["active", "probation"] },
  };
  if (companyId) {
    if (!isCrossCompanyRole && !allowedCompanies.includes(companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    where.companyId = companyId;
  } else if (!isCrossCompanyRole && allowedCompanies.length > 0) {
    where.companyId = { in: allowedCompanies };
  }
  if (departmentId) where.departmentId = departmentId;

  const employees = await db.hrEmployee.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      fullNameEn: true,
      positionEn: true,
      photo: true,
      companyId: true,
      departmentId: true,
      directManagerId: true,
      user: { select: { email: true } },
    },
    orderBy: { fullNameEn: "asc" },
  });

  // Index for tree assembly.
  const byId = new Map<string, OrgNode>();
  for (const e of employees) {
    byId.set(e.id, {
      id: e.id,
      employeeId: e.employeeId,
      name: e.fullNameEn,
      position: e.positionEn,
      email: e.user?.email ?? null,
      photo: e.photo,
      companyId: e.companyId,
      departmentId: e.departmentId,
      directManagerId: e.directManagerId,
      reports: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const node of byId.values()) {
    if (node.directManagerId && byId.has(node.directManagerId)) {
      byId.get(node.directManagerId)!.reports.push(node);
    } else {
      // Manager not in this slice (different company / not loaded) → treat as root.
      roots.push(node);
    }
  }

  return NextResponse.json({
    roots,
    totalEmployees: employees.length,
  });
}

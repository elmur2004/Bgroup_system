import { db } from "@/lib/db";
import { requireAdmin, getPaginationParams, jsonPaginated, jsonError } from "@/lib/partners/helpers";
import { NextRequest } from "next/server";

// GET /api/partners/audit-logs — Admin: list audit logs
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const pagination = getPaginationParams(searchParams);

  const where: Record<string, string> = {};
  const entity = searchParams.get("entity");
  const userId = searchParams.get("userId");
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;

  const [data, total] = await Promise.all([
    db.partnerAuditLog.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
    }),
    db.partnerAuditLog.count({ where }),
  ]);

  return jsonPaginated(data, total, pagination);
}

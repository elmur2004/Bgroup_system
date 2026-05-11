import { db } from "@/lib/db";
import { requireAdmin, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { NextRequest } from "next/server";

// GET /api/partners/audit-logs/[entity]/[entityId] — Admin: entity audit history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entity: string; entityId: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { entity, entityId } = await params;

  const logs = await db.partnerAuditLog.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: "desc" },
  });

  return jsonSuccess(logs);
}

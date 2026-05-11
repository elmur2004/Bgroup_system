import { db } from "@/lib/db";
import { requirePartnerAuth, getPaginationParams, jsonPaginated, jsonError } from "@/lib/partners/helpers";
import { NextRequest } from "next/server";

// GET /api/partners/notifications — List notifications for current user
export async function GET(request: NextRequest) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const searchParams = request.nextUrl.searchParams;
  const pagination = getPaginationParams(searchParams);

  const where: Record<string, unknown> = { userId: user.userId };
  const unreadOnly = searchParams.get("unreadOnly");
  if (unreadOnly === "true") {
    where.isRead = false;
  }

  const [data, total] = await Promise.all([
    db.partnerNotification.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
    }),
    db.partnerNotification.count({ where }),
  ]);

  return jsonPaginated(data, total, pagination);
}

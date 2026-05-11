import { db } from "@/lib/db";
import { requirePartnerAuth, jsonSuccess, jsonError } from "@/lib/partners/helpers";

// PATCH /api/partners/notifications/read-all — Mark all as read
export async function PATCH() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const result = await db.partnerNotification.updateMany({
    where: { userId: user.userId, isRead: false },
    data: { isRead: true },
  });

  return jsonSuccess({ markedAsRead: result.count });
}

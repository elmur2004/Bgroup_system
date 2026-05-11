import { db } from "@/lib/db";
import { requirePartnerAuth, jsonSuccess, jsonError } from "@/lib/partners/helpers";

// GET /api/partners/notifications/unread-count
export async function GET() {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const unreadCount = await db.partnerNotification.count({
    where: { userId: user.userId, isRead: false },
  });

  return jsonSuccess({ unreadCount });
}

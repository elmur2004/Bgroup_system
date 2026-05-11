import { db } from "@/lib/db";
import { requirePartnerAuth, jsonSuccess, jsonError } from "@/lib/partners/helpers";
import { NextRequest } from "next/server";

// PATCH /api/partners/notifications/[id]/read — Mark single notification as read
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requirePartnerAuth();
  if (error) return error;

  const { id } = await params;

  // Verify notification belongs to user
  const notification = await db.partnerNotification.findFirst({
    where: { id, userId: user.userId },
  });
  if (!notification) return jsonError("Notification not found", 404);

  const updated = await db.partnerNotification.update({
    where: { id },
    data: { isRead: true },
  });

  return jsonSuccess(updated);
}

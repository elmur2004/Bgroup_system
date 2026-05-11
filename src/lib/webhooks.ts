import { db } from "@/lib/db";
import { createHmac, randomBytes } from "node:crypto";

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/**
 * Persist a delivery row, attempt the POST, update the row with the result.
 * On non-2xx, increments failureCount on the endpoint and bumps `attempt`.
 *
 * Synchronous fire-and-forget. Production should hand off to a queue.
 */
export async function deliverWebhook(
  endpointId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoint = await db.webhookEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint || !endpoint.isActive) return;
  if (!endpoint.events.includes(event) && !endpoint.events.includes("*")) return;

  const delivery = await db.webhookDelivery.create({
    data: {
      endpointId,
      event,
      payload: JSON.parse(JSON.stringify(payload)),
      status: "PENDING",
    },
  });

  const body = JSON.stringify({ event, payload, deliveryId: delivery.id });
  const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BGroup-Event": event,
        "X-BGroup-Signature": `sha256=${signature}`,
        "X-BGroup-Delivery": delivery.id,
      },
      body,
    });
    const responseBody = await res.text().catch(() => "");
    if (res.ok) {
      await db.$transaction([
        db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SUCCEEDED",
            attempt: 1,
            responseStatus: res.status,
            responseBody: responseBody.slice(0, 2000),
            deliveredAt: new Date(),
          },
        }),
        db.webhookEndpoint.update({
          where: { id: endpointId },
          data: { failureCount: 0, lastDeliveryAt: new Date() },
        }),
      ]);
    } else {
      await db.$transaction([
        db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "FAILED",
            attempt: 1,
            responseStatus: res.status,
            responseBody: responseBody.slice(0, 2000),
          },
        }),
        db.webhookEndpoint.update({
          where: { id: endpointId },
          data: { failureCount: { increment: 1 }, lastDeliveryAt: new Date() },
        }),
      ]);
    }
  } catch (e) {
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        attempt: 1,
        responseBody: e instanceof Error ? e.message : "Network error",
      },
    });
  }
}

/** Fire an event to all matching subscribers. */
export async function emitEvent(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await db.webhookEndpoint.findMany({
    where: { isActive: true, events: { hasSome: [event, "*"] } },
    select: { id: true },
  });
  for (const e of endpoints) {
    void deliverWebhook(e.id, event, payload);
  }
}

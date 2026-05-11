import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { generateWebhookSecret } from "@/lib/webhooks";

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export async function GET() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;
  const endpoints = await db.webhookEndpoint.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      failureCount: true,
      lastDeliveryAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ endpoints });
}

export async function POST(req: Request) {
  const { session, error } = await requirePlatformAdmin();
  if (error) return error;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const secret = generateWebhookSecret();
  const endpoint = await db.webhookEndpoint.create({
    data: {
      ownerId: session.user.id!,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    },
  });
  // Return the secret exactly once.
  return NextResponse.json(
    { endpoint: { id: endpoint.id, url: endpoint.url, events: endpoint.events }, secret },
    { status: 201 }
  );
}

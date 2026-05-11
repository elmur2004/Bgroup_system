import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { subscribe, type AppEvent } from "@/lib/events/bus";

// SSE endpoint: streams events meant for the authenticated user.
//
// Usage on the client:
//   const es = new EventSource("/api/events");
//   es.addEventListener("notification.created", (e) => …);
//   es.onerror = () => es.close();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      const send = (data: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          isClosed = true;
        }
      };

      // Initial hello so the client knows the connection is live.
      send(`: connected\n\n`);

      // Heartbeat every 25s to keep proxies/Vercel from killing the stream.
      const heartbeat = setInterval(() => send(`: ping\n\n`), 25_000);

      // Forward bus events tagged for this user (or broadcast).
      const unsubscribe = subscribe((event: AppEvent) => {
        // Per-user filtering — bus events carry a userId field.
        if ("userId" in event && event.userId !== userId) return;
        const payload = JSON.stringify(event.payload);
        send(`event: ${event.type}\n`);
        send(`data: ${payload}\n\n`);
      });

      // Close on client disconnect.
      const abort = req.signal;
      const onAbort = () => {
        isClosed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      if (abort.aborted) onAbort();
      else abort.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

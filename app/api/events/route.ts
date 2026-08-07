import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channels = (searchParams.get("channels") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      send({ type: "connected" });

      const unsubscribers = channels.map((channel) =>
        subscribe(channel, (payload) => {
          send({ channel, payload });
        }),
      );

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // stream closed
        }
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribers.forEach((unsub) => unsub());
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      if (req.signal.aborted) {
        cleanup();
      } else {
        req.signal.addEventListener("abort", cleanup, { once: true });
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

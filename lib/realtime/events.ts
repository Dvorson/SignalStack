type EventPayload = Record<string, unknown>;
type EventListener = (payload: EventPayload) => void;

const channelListeners = new Map<string, Set<EventListener>>();

export function publishEvent(channel: string, payload: EventPayload) {
  const listeners = channelListeners.get(channel);
  if (!listeners) return;

  for (const listener of listeners) {
    listener(payload);
  }
}

export function subscribeEvent(channel: string, listener: EventListener) {
  const listeners = channelListeners.get(channel) ?? new Set<EventListener>();
  listeners.add(listener);
  channelListeners.set(channel, listeners);

  return () => {
    const current = channelListeners.get(channel);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      channelListeners.delete(channel);
    }
  };
}

export function createSseResponse(channel: string) {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: EventPayload) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup?.();
        }
      };

      send({ type: 'connected', channel, timestamp: new Date().toISOString() });

      const unsubscribe = subscribeEvent(channel, send);
      const ping = setInterval(() => {
        send({ type: 'ping', channel, timestamp: new Date().toISOString() });
      }, 15000);

      cleanup = () => {
        clearInterval(ping);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

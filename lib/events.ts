type Listener = (payload: unknown) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(channel: string, listener: Listener): () => void {
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set());
  }
  listeners.get(channel)!.add(listener);
  return () => {
    listeners.get(channel)?.delete(listener);
  };
}

export function publish(channel: string, payload?: unknown) {
  const set = listeners.get(channel);
  if (!set) return;
  for (const listener of Array.from(set)) {
    try {
      listener(payload);
    } catch (error) {
      console.error("[Events] listener error:", error);
    }
  }
}

export const EventChannels = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  CHARM_UPDATED: "charm:updated",
  CATEGORY_UPDATED: "category:updated",
  orderStatus: (orderId: string) => `order:status:${orderId}`,
  orderPayment: (orderId: string) => `order:payment:${orderId}`,
} as const;

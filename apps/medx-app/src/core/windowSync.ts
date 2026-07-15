import { useStore } from "../data/store";

/**
 * Live queue sync between app windows (main window ↔ counter display).
 *
 * Each Electron window is a separate renderer process with its own store,
 * hydrated once at open — without this module, "Call Next" in the main
 * window never reaches the counter display.
 *
 * Transport: the Electron main process relays messages to every other window
 * (window.medx.broadcast/onBroadcast). In the browser (dev preview) a
 * BroadcastChannel does the same job.
 */

interface QueueSyncMessage {
  type: "queue";
  tokens: unknown[];
  seq: Record<string, number>;
}

let applyingRemote = false;
let started = false;

function makeTransport(): {
  post: (msg: QueueSyncMessage) => void;
  listen: (cb: (msg: QueueSyncMessage) => void) => void;
} | null {
  if (typeof window === "undefined") return null;

  if (window.medx?.broadcast && window.medx?.onBroadcast) {
    return {
      post: (msg) => window.medx!.broadcast!(JSON.stringify(msg)),
      listen: (cb) =>
        window.medx!.onBroadcast!((raw: string) => {
          try {
            cb(JSON.parse(raw));
          } catch {
            /* ignore malformed frames */
          }
        }),
    };
  }

  if ("BroadcastChannel" in window) {
    const ch = new BroadcastChannel("medx-window-sync");
    return {
      post: (msg) => ch.postMessage(msg),
      listen: (cb) => {
        ch.onmessage = (e) => cb(e.data as QueueSyncMessage);
      },
    };
  }

  return null;
}

export function initWindowSync() {
  if (started) return;
  started = true;

  const transport = makeTransport();
  if (!transport) return;

  transport.listen((msg) => {
    if (!msg || msg.type !== "queue" || !Array.isArray(msg.tokens)) return;
    applyingRemote = true;
    try {
      // Merge only token counters — other sequence counters (invoices,
      // accessions) belong to the window that owns them.
      const seq = { ...useStore.getState().seq };
      for (const [key, value] of Object.entries(msg.seq ?? {})) {
        if (key.startsWith("tok:")) seq[key] = value;
      }
      useStore.setState({ tokens: msg.tokens as never, seq });
    } finally {
      applyingRemote = false;
    }
  });

  useStore.subscribe((state, prevState) => {
    if (applyingRemote) return;
    if (state.tokens !== prevState.tokens) {
      transport.post({ type: "queue", tokens: state.tokens, seq: state.seq });
    }
  });
}

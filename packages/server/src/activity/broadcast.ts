import { parse as parseUrl } from "node:url";
import type { Server } from "node:http";
import type { WebSocket as WsClient } from "ws";
import { WebSocketServer } from "ws";
import { buildActivitySnapshot } from "./snapshot.js";
import { getIndexJobState } from "../indexing/job-store.js";
import { validateSessionFromCookie } from "../auth/middleware.js";
import { getSyncState } from "../s3/sync-state.js";

const clients = new Set<WsClient>();

const WS_OPEN = 1;

/** Keep connections alive through proxies; browser responds to ping automatically. */
const PING_MS = 25_000;
const pingInterval = setInterval(() => {
  for (const ws of clients) {
    if (ws.readyState === WS_OPEN) {
      try {
        ws.ping();
      } catch {
        clients.delete(ws);
      }
    }
  }
}, PING_MS);

/** Avoid keeping the process alive solely for this timer in edge cases. */
if (typeof pingInterval.unref === "function") {
  pingInterval.unref();
}

export function broadcastActivity(): void {
  const payload = buildActivitySnapshot(getIndexJobState(), getSyncState());
  const msg = JSON.stringify({ type: "activity", v: 1, payload });
  for (const ws of clients) {
    if (ws.readyState === WS_OPEN) {
      ws.send(msg);
    }
  }
}

export function attachActivityWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const pathname = parseUrl(request.url ?? "/", false).pathname ?? null;
    if (pathname === null) {
      socket.destroy();
      return;
    }

    if (pathname !== "/ws/activity") {
      socket.destroy();
      return;
    }

    const cookieHeader = request.headers.cookie;
    const user = await validateSessionFromCookie(cookieHeader);
    if (!user) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      clients.add(ws);
      const payload = buildActivitySnapshot(getIndexJobState(), getSyncState());
      ws.send(JSON.stringify({ type: "activity", v: 1, payload }));

      ws.on("pong", () => {
        /* keepalive */
      });

      ws.on("close", () => {
        clients.delete(ws);
      });
      ws.on("error", () => {
        clients.delete(ws);
      });
    });
  });
}

import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { signAccessToken } from "../auth/jwt.js";
import { attachActivityWebSocket } from "./broadcast.js";

const listen = (server: ReturnType<typeof createServer>): Promise<number> =>
  new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr === null || typeof addr === "string") {
        reject(new Error("expected TCP address"));
        return;
      }
      resolve(addr.port);
    });
  });

const closeServer = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

describe("attachActivityWebSocket", () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(closeServer));
  });

  it("rejects upgrade without a valid session cookie", async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 404;
      res.end();
    });
    servers.push(server);
    attachActivityWebSocket(server);
    const port = await listen(server);

    const outcome = await new Promise<"open" | "rejected">((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/activity`);
      const timer = setTimeout(() => {
        ws.terminate();
        resolve("rejected");
      }, 3000);
      ws.on("open", () => {
        clearTimeout(timer);
        ws.close();
        resolve("open");
      });
      ws.on("unexpected-response", (_req, res) => {
        clearTimeout(timer);
        res.resume();
        resolve("rejected");
      });
      ws.on("error", () => {
        clearTimeout(timer);
        resolve("rejected");
      });
      ws.on("close", () => {
        clearTimeout(timer);
        resolve("rejected");
      });
    });

    expect(outcome).toBe("rejected");
  });

  it("accepts upgrade with a valid access_token cookie", async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 404;
      res.end();
    });
    servers.push(server);
    attachActivityWebSocket(server);
    const port = await listen(server);
    const token = await signAccessToken({
      sub: 1,
      email: "ws@test.local",
      isAdmin: false,
    });

    const opened = await new Promise<boolean>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/activity`, {
        headers: { Cookie: `access_token=${token}` },
      });
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("WebSocket open timeout"));
      }, 5000);
      ws.on("open", () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    expect(opened).toBe(true);
  });
});

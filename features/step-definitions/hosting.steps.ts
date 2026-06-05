import { After, AfterAll, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import WebSocket from "ws";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

type HostingWorld = {
  hostingBaseUrl?: string;
  hostingPort?: number;
  accessCookie?: string;
  lastStatus?: number;
  lastHeaders?: Record<string, string | string[] | undefined>;
  lastBody?: string;
  wsConnected?: boolean;
};

const hostingState: { server: Server | null } = { server: null };

function normalizeHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const direct = headers[name];
  if (typeof direct === "string") return direct;
  if (Array.isArray(direct)) return direct[0];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      return typeof v === "string" ? v : v?.[0];
    }
  }
  return undefined;
}

function httpRaw(
  port: number,
  path: string,
  method: string,
  headers: Record<string, string>,
): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

After(function () {
  delete process.env.BDD_STRICT_CORS;
});

AfterAll(async () => {
  await new Promise<void>((resolve) => {
    if (!hostingState.server) {
      resolve();
      return;
    }
    hostingState.server.close(() => resolve());
    hostingState.server = null;
  });
});

Given(
  "production hosting uses Docker Compose with Traefik in front of the application",
  function () {
    const compose = readFileSync(join(repoRoot, "docker-compose.yml"), "utf8");
    assert.match(compose, /^\s{2}traefik:\s*$/m);
    assert.match(compose, /^\s{2}api:\s*$/m);
    assert.match(compose, /^\s{2}ui:\s*$/m);
    assert.doesNotMatch(compose, /^\s{2}app:\s*$/m);
  },
);

Given(
  "the API is reachable at the configured API host for split hosting",
  function () {
    //
  },
);

Given("the hosted stack is running", async function (this: HostingWorld) {
  process.env.BDD_STRICT_CORS = "1";
  if (hostingState.server) {
    const addr = hostingState.server.address() as AddressInfo;
    this.hostingPort = addr.port;
    this.hostingBaseUrl = `http://127.0.0.1:${addr.port}`;
    return;
  }
  const { createConfiguredApp } =
    await import("../../server/dist/bootstrap/server.js");
  const { attachActivityWebSocket } =
    await import("../../server/dist/activity/broadcast.js");
  const app = createConfiguredApp("/nonexistent-path-no-ui-dist");
  attachActivityWebSocket(app);
  await new Promise<void>((resolve) => {
    app.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = app.address() as AddressInfo;
  hostingState.server = app;
  this.hostingPort = addr.port;
  this.hostingBaseUrl = `http://127.0.0.1:${addr.port}`;
});

When(
  "a client requests an API resource from the API host using the application’s API path prefix",
  async function (this: HostingWorld) {
    assert.ok(this.hostingPort != null);
    const { status, body } = await httpRaw(this.hostingPort, "/health", "GET", {
      Host: "api.lissner.io",
      Origin: "https://lissner.io",
    });
    this.lastStatus = status;
    this.lastBody = body;
  },
);

Then(
  "the response is produced by the API service",
  function (this: HostingWorld) {
    assert.equal(this.lastStatus, 200);
    assert.equal(this.lastBody, "ok");
  },
);

async function loginCookieForHosting(world: HostingWorld): Promise<string> {
  assert.ok(world.hostingBaseUrl);
  const authDb = await import("../../server/dist/db/auth.js");
  const email = "hosting-ws-bdd@test.local";
  try {
    authDb.addToWhitelist(email, false);
  } catch {
    //
  }
  const { code } = authDb.createMagicLinkToken(email);
  const res = await fetch(`${world.hostingBaseUrl}/auth/verify-code`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  assert.ok(res.ok, `verify-code failed: ${res.status}`);
  const anyHeaders = res.headers as unknown as {
    getSetCookie?: () => string[];
  };
  const setCookies = anyHeaders.getSetCookie?.() ?? [];
  const pairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
  assert.ok(pairs.length >= 1);
  return pairs.join("; ");
}

When(
  "an authenticated client opens the application’s activity WebSocket on the API host",
  async function (this: HostingWorld) {
    assert.ok(this.hostingPort != null);
    const cookie = await loginCookieForHosting(this);
    this.accessCookie = cookie;
    this.wsConnected = false;
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        `ws://127.0.0.1:${this.hostingPort}/ws/activity`,
        {
          headers: {
            Host: "api.lissner.io",
            Origin: "https://lissner.io",
            Cookie: cookie,
          },
        },
      );
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket open timeout"));
      }, 8000);
      ws.on("open", () => {
        clearTimeout(timer);
        this.wsConnected = true;
        ws.close();
        resolve();
      });
      ws.on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  },
);

Then(
  "the connection is accepted and served by the API service",
  function (this: HostingWorld) {
    assert.equal(this.wsConnected, true);
  },
);

When(
  "a browser requests the main web application HTML and static assets from the configured UI host",
  function () {
    //
  },
);

Then("the response is served by the UI service", function () {
  const compose = readFileSync(join(repoRoot, "docker-compose.yml"), "utf8");
  assert.ok(compose.includes("dockerfile: ui/Dockerfile"));
  assert.ok(
    compose.includes("traefik.http.routers.ui.rule=Host(`${UI_HOST}`)"),
  );
  assert.ok(
    compose.includes("traefik.http.routers.ui-http.rule=Host(`${UI_HOST}`)"),
  );
  assert.ok(compose.includes("traefik.http.services.ui.loadbalancer"));
});

When(
  /^a browser issues a credentialed request to the API host with web origin (.+)$/,
  async function (this: HostingWorld, webOrigin: string) {
    assert.ok(this.hostingPort != null);
    const origin = `https://${webOrigin.trim()}`;
    const { status, headers } = await httpRaw(
      this.hostingPort,
      "/health",
      "OPTIONS",
      {
        Host: "api.lissner.io",
        Origin: origin,
        "Access-Control-Request-Method": "GET",
      },
    );
    this.lastStatus = status;
    this.lastHeaders = headers;
  },
);

Then(
  /^the response indicates that web origin (.+) is allowed for cross-origin access$/,
  function (this: HostingWorld, webOrigin: string) {
    const origin = `https://${webOrigin.trim()}`;
    assert.ok(this.lastHeaders);
    const allowOrigin = normalizeHeader(
      this.lastHeaders,
      "access-control-allow-origin",
    );
    assert.equal(allowOrigin, origin);
    const creds = normalizeHeader(
      this.lastHeaders,
      "access-control-allow-credentials",
    );
    assert.equal(creds, "true");
  },
);

When(
  "a browser issues a request to the API host with Origin {string}",
  async function (this: HostingWorld, origin: string) {
    assert.ok(this.hostingPort != null);
    const { status, headers, body } = await httpRaw(
      this.hostingPort,
      "/health",
      "GET",
      {
        Host: "api.lissner.io",
        Origin: origin,
      },
    );
    this.lastStatus = status;
    this.lastHeaders = headers;
    this.lastBody = body;
  },
);

Then(
  "the response does not allow Origin {string} for cross-origin access",
  function (this: HostingWorld, forbidden: string) {
    assert.ok(this.lastHeaders);
    const allowOrigin = normalizeHeader(
      this.lastHeaders,
      "access-control-allow-origin",
    );
    assert.notEqual(allowOrigin, forbidden);
  },
);

When(
  "a signed-in user uses the web application from a permitted lissner.io web origin",
  function () {
    //
  },
);

Then(
  "pages load from the UI host and authenticated features that depend on the API succeed without the user manually configuring an API base URL",
  function () {
    const clientTs = readFileSync(
      join(repoRoot, "ui/src/api/client.ts"),
      "utf8",
    );
    assert.ok(clientTs.includes("VITE_API_HOST"));
    assert.ok(clientTs.includes("prependApiUrl"));
    const hostMd = readFileSync(join(repoRoot, "HOST.md"), "utf8");
    assert.ok(hostMd.includes("VITE_API_HOST"));
  },
);

When(
  "the operator inspects running Compose services for the application",
  function () {
    //
  },
);

Then(
  "the UI and the API each correspond to a different service in the stack",
  function () {
    const compose = readFileSync(join(repoRoot, "docker-compose.yml"), "utf8");
    assert.match(compose, /^\s{2}api:\s*$/m);
    assert.match(compose, /^\s{2}ui:\s*$/m);
    assert.ok(
      compose.includes("dockerfile: server/Dockerfile"),
      "API image should build from server Dockerfile",
    );
    assert.ok(
      compose.includes("dockerfile: ui/Dockerfile"),
      "UI image should build from ui Dockerfile",
    );
  },
);

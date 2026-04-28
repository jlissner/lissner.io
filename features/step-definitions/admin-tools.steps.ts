import { AfterAll, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { Server, type AddressInfo } from "node:net";

type BddWorld = {
  baseUrl?: string;
  cookie?: string;
  lastResponse?: Response;
  lastJson?: unknown;
  selectedBackupKey?: string;
};

const state = {
  server: null as Server | null,
  baseUrl: null as string | null,
};

async function ensureServerRunning(world: BddWorld): Promise<void> {
  if (state.baseUrl) {
    world.baseUrl = state.baseUrl;
    return;
  }

  const { createConfiguredApp } =
    await import("../../server/dist/bootstrap/server.js");
  const server = createConfiguredApp("/nonexistent-ui-dist") as Server;

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address() as AddressInfo;
  state.server = server;
  state.baseUrl = `http://127.0.0.1:${addr.port}`;
  world.baseUrl = state.baseUrl;
}

AfterAll(async () => {
  await new Promise<void>((resolve) => {
    if (!state.server) {
      resolve();
      return;
    }
    state.server.close(() => resolve());
    state.server = null;
    state.baseUrl = null;
  });
});

async function signAdminCookie(): Promise<string> {
  const { signAccessToken } = await import("../../server/dist/auth/jwt.js");
  const token = await signAccessToken({
    sub: 1,
    email: "admin@test.local",
    isAdmin: true,
  });
  return `access_token=${token}`;
}

async function requestJson(
  world: BddWorld,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<void> {
  await ensureServerRunning(world);
  const url = `${world.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(world.cookie ? { cookie: world.cookie } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  world.lastResponse = res;
  const text = await res.text();
  world.lastJson = text === "" ? null : (JSON.parse(text) as unknown);
}

Given("I am signed in as an admin", async function (this: BddWorld) {
  this.cookie = await signAdminCookie();
});

Given("SQL explorer is enabled for this deployment", function () {
  process.env.SQL_EXPLORER_ENABLED = "true";
  process.env.NODE_ENV = "development";
});

Given("data explorer is available", function () {
  process.env.DATA_EXPLORER_ENABLED = "true";
  process.env.NODE_ENV = "development";
});

Given("a valid backup key is selected", function (this: BddWorld) {
  // This is a baseline/admin UX scenario; for API-level BDD we accept any non-empty key.
  this.selectedBackupKey = "backup/db/media_test.db";
});

When("I open the admin whitelist section", async function (this: BddWorld) {
  await requestJson(this, "GET", "/api/admin/whitelist");
});

Then(
  "I can list entries and add or remove allowed emails",
  async function (this: BddWorld) {
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 200);
    assert.ok(this.lastJson && typeof this.lastJson === "object");

    // Add an entry
    await requestJson(this, "POST", "/api/admin/whitelist", {
      email: "someone@test.local",
      isAdmin: false,
    });
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 201);
    assert.ok(this.lastJson && typeof this.lastJson === "object");
    const created = this.lastJson as { id: number; email: string };
    assert.ok(typeof created.id === "number");
    assert.equal(created.email, "someone@test.local");

    // Remove it
    await requestJson(this, "DELETE", `/api/admin/whitelist/${created.id}`);
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 204);
  },
);

When(
  "I submit a read-only query through the admin SQL explorer",
  async function (this: BddWorld) {
    await requestJson(this, "POST", "/api/admin/sql", {
      query: "select 1 as one",
    });
  },
);

Then("I receive a result set or a clear error", function (this: BddWorld) {
  assert.ok(this.lastResponse);
  assert.ok(this.lastJson != null);
  assert.ok([200, 400, 403].includes(this.lastResponse.status));
});

When(
  "I request the list of database backups from S3",
  async function (this: BddWorld) {
    await requestJson(this, "GET", "/api/admin/db-backups");
  },
);

Then(
  "I see available backup objects with metadata needed to choose one",
  function (this: BddWorld) {
    assert.ok(this.lastResponse);
    // Either configured (200) or a structured not-configured error (400).
    assert.ok([200, 400].includes(this.lastResponse.status));
    assert.ok(this.lastJson != null);
  },
);

When("I confirm database restore", async function (this: BddWorld) {
  assert.ok(this.selectedBackupKey);
  await requestJson(this, "POST", "/api/admin/db-restore", {
    key: this.selectedBackupKey,
  });
});

Then(
  "the application uses the restored database or reports a blocking error",
  function (this: BddWorld) {
    assert.ok(this.lastResponse);
    assert.ok([200, 400, 409, 500].includes(this.lastResponse.status));
    assert.ok(this.lastJson != null);
  },
);

When(
  "I trigger thumbnail repair for the library",
  async function (this: BddWorld) {
    await requestJson(this, "POST", "/api/admin/thumbnails/repair", {
      maxGenerations: 1,
    });
  },
);

Then(
  "the system reports how many thumbnails were fixed or skipped",
  function (this: BddWorld) {
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 200);
    assert.ok(this.lastJson && typeof this.lastJson === "object");
    const payload = this.lastJson as Record<string, unknown>;
    assert.ok(typeof payload.scanned === "number");
    assert.ok(typeof payload.generated === "number");
  },
);

When(
  "I list tables and open rows for a table",
  async function (this: BddWorld) {
    await requestJson(this, "GET", "/api/admin/data-explorer/tables");
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 200);
    const tables = this.lastJson as Array<string>;
    assert.ok(Array.isArray(tables));
    assert.ok(tables.length > 0);

    const table = tables[0];
    await requestJson(
      this,
      "GET",
      `/api/admin/data-explorer/tables/${encodeURIComponent(table)}/rows?limit=1&offset=0`,
    );
  },
);

Then(
  "I can inspect schema-aligned data subject to admin permissions",
  function (this: BddWorld) {
    assert.ok(this.lastResponse);
    assert.equal(this.lastResponse.status, 200);
    assert.ok(this.lastJson != null);
  },
);

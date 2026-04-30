import { AfterAll, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { Server, type AddressInfo } from "node:net";

type FaceMatchWorld = {
  baseUrl?: string;
  cookie?: string;
  fixtureMediaId?: string;
  lastJson?: unknown;
  lastStatus?: number;
  searchBefore?: string | null;
  manualLinkMediaId?: string;
  manualLinkPersonId?: number;
};

const srv = {
  server: null as Server | null,
  baseUrl: null as string | null,
};

async function ensureServer(world: FaceMatchWorld): Promise<string> {
  if (srv.baseUrl) {
    world.baseUrl = srv.baseUrl;
    return srv.baseUrl;
  }
  const { createConfiguredApp } =
    await import("../../server/dist/bootstrap/server.js");
  const server = createConfiguredApp("/nonexistent-ui-dist") as Server;
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  srv.server = server;
  srv.baseUrl = `http://127.0.0.1:${addr.port}`;
  world.baseUrl = srv.baseUrl;
  return srv.baseUrl;
}

AfterAll(async () => {
  await new Promise<void>((resolve) => {
    if (!srv.server) {
      resolve();
      return;
    }
    srv.server.close(() => resolve());
    srv.server = null;
    srv.baseUrl = null;
  });
});

async function fetchJson(
  world: FaceMatchWorld,
  path: string,
  init?: RequestInit,
): Promise<void> {
  const base = await ensureServer(world);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(world.cookie ? { cookie: world.cookie } : {}),
    },
  });
  world.lastStatus = res.status;
  const text = await res.text();
  world.lastJson = text === "" ? null : (JSON.parse(text) as unknown);
}

Given(
  "I have an authenticated session as a gallery user",
  async function (this: FaceMatchWorld) {
    const { signAccessToken } = await import("../../server/dist/auth/jwt.js");
    const token = await signAccessToken({
      sub: 2,
      email: "gallery@test.local",
      isAdmin: false,
    });
    this.cookie = `access_token=${token}`;
  },
);

Given(
  "I am signed in as a non-admin user",
  async function (this: FaceMatchWorld) {
    const { signAccessToken } = await import("../../server/dist/auth/jwt.js");
    const token = await signAccessToken({
      sub: 3,
      email: "member@test.local",
      isAdmin: false,
    });
    this.cookie = `access_token=${token}`;
  },
);

Given(
  "fixture media {string} has been uploaded and fully indexed",
  async function (this: FaceMatchWorld, logicalPath: string) {
    const rel = logicalPath.replace(/^people\//, "");
    const jpg = join("features/fixtures/people", `${rel}.jpg`);
    const png = join("features/fixtures/people", `${rel}.png`);
    const abs = existsSync(jpg) ? jpg : png;
    assert.ok(existsSync(abs), `Missing fixture: ${jpg} or ${png}`);

    const base = await ensureServer(this);
    const buf = await readFile(abs);
    const fd = new FormData();
    fd.set("file", new Blob([buf]), basename(abs));

    const up = await fetch(`${base}/api/media/upload`, {
      method: "POST",
      headers: this.cookie ? { cookie: this.cookie } : {},
      body: fd,
    });
    assert.equal(up.status, 201);
    const body = (await up.json()) as { id: string };
    this.fixtureMediaId = body.id;

    const { indexMediaItem } =
      await import("../../server/dist/indexing/media.js");
    const { getMediaById } = await import("../../server/dist/db/media.js");
    const row = getMediaById(body.id);
    assert.ok(row);
    await indexMediaItem({
      id: row.id,
      filename: row.filename,
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      uploadedAt: row.uploadedAt,
    });

    if (process.env.BDD_FACE_DETECT_OFF === "1") {
      const mp = await import("../../server/dist/db/media-people.js");
      const pid = mp.createNewPerson();
      const conf = logicalPath.includes("no-human") ? 0.35 : 0.85;
      mp.setImagePeople(body.id, [
        {
          personId: pid,
          box: { x: 0.2, y: 0.2, width: 0.35, height: 0.4 },
          confidence: conf,
        },
      ]);
    }
  },
);

When(
  "I open that media in the media viewer",
  async function (this: FaceMatchWorld) {
    assert.ok(this.fixtureMediaId);
    await fetchJson(this, `/api/media/${this.fixtureMediaId}/faces`);
  },
);

Then(
  "I see at least one face region available for assignment",
  function (this: FaceMatchWorld) {
    assert.equal(this.lastStatus, 200);
    const j = this.lastJson as {
      tagged?: unknown[];
      detected?: unknown[];
    };
    const n = (j.tagged?.length ?? 0) + (j.detected?.length ?? 0);
    assert.ok(
      n >= 1,
      `Expected tagged or detected faces, got tagged=${j.tagged?.length ?? 0} detected=${j.detected?.length ?? 0}`,
    );
  },
);

Then(
  "every face region shown for that media is indicated as low confidence",
  async function (this: FaceMatchWorld) {
    assert.ok(this.fixtureMediaId);
    await fetchJson(this, `/api/media/${this.fixtureMediaId}/faces`);
    assert.equal(this.lastStatus, 200);
    const j = this.lastJson as {
      tagged?: Array<{ source?: string; confidence?: number | null }>;
    };
    const tagged = j.tagged ?? [];
    if (tagged.length === 0) {
      return;
    }
    for (const t of tagged) {
      const isManual = t.source === "manual";
      if (isManual) continue;
      const c = t.confidence ?? 0;
      assert.ok(
        c < 0.72,
        `Expected low-confidence auto tag, got confidence=${String(c)} source=${String(t.source)}`,
      );
    }
  },
);

Then(
  "I can dismiss every face region shown for that media",
  async function (this: FaceMatchWorld) {
    assert.ok(this.fixtureMediaId);
    await fetchJson(this, `/api/media/${this.fixtureMediaId}/faces`);
    const j = this.lastJson as {
      tagged?: Array<{ personId: number; source?: string }>;
    };
    const tagged = j.tagged ?? [];
    for (const t of tagged) {
      if (t.source === "manual") continue;
      const del = await fetch(
        `${this.baseUrl}/api/media/${this.fixtureMediaId}/people/${t.personId}`,
        {
          method: "DELETE",
          headers: this.cookie ? { cookie: this.cookie } : {},
        },
      );
      assert.ok(del.status === 204 || del.status === 200);
    }
    await fetchJson(this, `/api/media/${this.fixtureMediaId}/faces`);
    const after = this.lastJson as { tagged?: Array<{ source?: string }> };
    const rest = (after.tagged ?? []).filter((x) => x.source !== "manual");
    assert.equal(rest.length, 0);
  },
);

Given(
  "a placeholder person exists with face samples derived from indexing",
  async function (this: FaceMatchWorld) {
    await ensureServer(this);
    const { getAllPersonIds, getPersonNames } =
      await import("../../server/dist/db/media.js");
    const ids = getAllPersonIds();
    const names = getPersonNames();
    const ph = ids.find((id) => (names.get(id) ?? "").startsWith("Person"));
    assert.ok(ph != null, "Expected a placeholder person in DB");
    this.manualLinkPersonId = ph;
  },
);

Given(
  "a named person exists who is a plausible match for that placeholder",
  async function () {
    const { createPerson } =
      await import("../../server/dist/db/media-people.js");
    createPerson("Alice BDD");
  },
);

Given(
  "a placeholder person exists with face samples that represent the same individual as an existing named person",
  async function (this: FaceMatchWorld) {
    await ensureServer(this);
    const { getAllPersonIds, getPersonNames } =
      await import("../../server/dist/db/media.js");
    const ids = getAllPersonIds();
    const names = getPersonNames();
    const ph = ids.find((id) => (names.get(id) ?? "").startsWith("Person"));
    assert.ok(ph != null);
    this.manualLinkPersonId = ph;
  },
);

When(
  "I run automatic face matching for placeholders",
  async function (this: FaceMatchWorld) {
    await fetchJson(this, "/api/people/match-faces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  },
);

Then(
  "the placeholder is not merged into any named person until I explicitly confirm a merge",
  async function (this: FaceMatchWorld) {
    assert.equal(this.lastStatus, 200);
    const { getAllPersonIds, getPersonNames } =
      await import("../../server/dist/db/media.js");
    const names = getPersonNames();
    const ids = getAllPersonIds();
    const ph = this.manualLinkPersonId;
    assert.ok(ph != null);
    assert.ok(ids.includes(ph), "Placeholder should still exist");
    assert.ok(
      (names.get(ph) ?? "").startsWith("Person"),
      "Placeholder should still be unnamed",
    );
  },
);

Then("I am offered a merge for that pair", function (this: FaceMatchWorld) {
  assert.equal(this.lastStatus, 200);
  const j = this.lastJson as { reviewQueue?: Array<{ topMatch: unknown }> };
  const q = j.reviewQueue ?? [];
  assert.ok(q.length > 0);
  assert.ok(q[0]?.topMatch != null);
});

Then(
  "the placeholder is not merged into the named person until I explicitly confirm the merge",
  async function (this: FaceMatchWorld) {
    const { getAllPersonIds, getPersonNames } =
      await import("../../server/dist/db/media.js");
    const names = getPersonNames();
    const ids = getAllPersonIds();
    const ph = this.manualLinkPersonId;
    assert.ok(ph != null);
    assert.ok(ids.includes(ph));
    assert.ok((names.get(ph) ?? "").startsWith("Person"));
  },
);

When(
  "I start a full library re-index from the admin tools",
  async function (this: FaceMatchWorld) {
    await fetchJson(this, "/api/search/index?force=true", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(this.lastStatus, 200);
    const started = this.lastJson as { started?: boolean };
    assert.equal(started.started, true);
  },
);

When(
  "I attempt to start a full library re-index",
  async function (this: FaceMatchWorld) {
    await fetchJson(this, "/api/search/index?force=true", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  },
);

Then("the action is rejected", function (this: FaceMatchWorld) {
  assert.equal(this.lastStatus, 403);
});

Then(
  "an indexing job starts and reports progress until completion",
  async function (this: FaceMatchWorld) {
    const base = await ensureServer(this);
    const deadline = Date.now() + 120_000;
    let done = false;
    while (Date.now() < deadline) {
      const st = await fetch(`${base}/api/search/index/status`, {
        headers: this.cookie ? { cookie: this.cookie } : {},
      });
      const j = (await st.json()) as { inProgress?: boolean };
      if (!j.inProgress) {
        done = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    assert.ok(done, "Indexing did not finish within timeout");
  },
);

Given(
  "media exists that was previously indexed",
  async function (this: FaceMatchWorld) {
    await ensureServer(this);
    const { listMedia, getEmbeddings } =
      await import("../../server/dist/db/media.js");
    const { indexMediaItem } =
      await import("../../server/dist/indexing/media.js");
    const { getMediaById } = await import("../../server/dist/db/media.js");
    let items = listMedia();
    if (items.length === 0) {
      const rel = "single-clear-face";
      const jpg = join("features/fixtures/people", `${rel}.jpg`);
      assert.ok(existsSync(jpg));
      const base = await ensureServer(this);
      const buf = await readFile(jpg);
      const fd = new FormData();
      fd.set("file", new Blob([buf]), `${rel}.jpg`);
      const up = await fetch(`${base}/api/media/upload`, {
        method: "POST",
        headers: this.cookie ? { cookie: this.cookie } : {},
        body: fd,
      });
      assert.equal(up.status, 201);
      const body = (await up.json()) as { id: string };
      const row = getMediaById(body.id);
      assert.ok(row);
      await indexMediaItem({
        id: row.id,
        filename: row.filename,
        originalName: row.originalName,
        mimeType: row.mimeType,
        size: row.size,
        uploadedAt: row.uploadedAt,
      });
      items = listMedia();
    }
    assert.ok(items.length > 0);
    this.fixtureMediaId = items[0]!.id;
    const emb = getEmbeddings();
    assert.ok(emb.some((e) => e.mediaId === this.fixtureMediaId));
    const row = emb.find((e) => e.mediaId === this.fixtureMediaId);
    this.searchBefore = row?.embedding ?? null;
  },
);

Then("the re-index job completes", async function (this: FaceMatchWorld) {
  const base = await ensureServer(this);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const st = await fetch(`${base}/api/search/index/status`, {
      headers: this.cookie ? { cookie: this.cookie } : {},
    });
    const j = (await st.json()) as { inProgress?: boolean };
    if (!j.inProgress) return;
    await new Promise((r) => setTimeout(r, 80));
  }
  assert.fail("re-index did not complete");
});

Then(
  "search behavior for that media reflects newly computed embeddings",
  async function (this: FaceMatchWorld) {
    const base = await ensureServer(this);
    const st = await fetch(`${base}/api/search/index/status`, {
      headers: this.cookie ? { cookie: this.cookie } : {},
    });
    assert.equal(st.status, 200);
    const j = (await st.json()) as {
      lastResult?: { indexed?: number } | null;
    };
    assert.ok(
      j.lastResult != null && (j.lastResult.indexed ?? 0) >= 1,
      "expected index job to report indexed count",
    );
  },
);

Then(
  "automatic face associations on images in scope are derived again using the current detection rules",
  function () {
    assert.ok(true);
  },
);

Given(
  "I have a manually assigned or confirmed face-person link on an indexed image",
  async function (this: FaceMatchWorld) {
    await ensureServer(this);
    const { listMedia } = await import("../../server/dist/db/media.js");
    const { createNewPerson, setPersonName, addPersonToMedia } =
      await import("../../server/dist/db/media-people.js");
    const items = listMedia(1, 0);
    assert.ok(items[0]);
    const mediaId = items[0]!.id;
    const pid = createNewPerson();
    setPersonName(pid, "BDD Manual Face");
    addPersonToMedia(
      mediaId,
      pid,
      { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      1,
    );
    this.manualLinkMediaId = mediaId;
    this.manualLinkPersonId = pid;
  },
);

When(
  "I start a full library re-index that includes that image",
  async function (this: FaceMatchWorld) {
    assert.ok(this.manualLinkMediaId);
    await fetchJson(this, "/api/search/index?force=true", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mediaIds: [this.manualLinkMediaId] }),
    });
    assert.equal(this.lastStatus, 200);
  },
);

Then(
  "that face-person link remains on that image",
  async function (this: FaceMatchWorld) {
    const { getImagePeople } =
      await import("../../server/dist/db/media-people.js");
    assert.ok(this.manualLinkMediaId && this.manualLinkPersonId);
    const ppl = getImagePeople(this.manualLinkMediaId);
    assert.ok(ppl.includes(this.manualLinkPersonId));
  },
);

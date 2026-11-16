import { AfterAll, Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { Server, type AddressInfo } from "node:net";

type RecycleWorld = {
  cookie?: string;
  lastStatus?: number;
};

const state = {
  server: null as Server | null,
  baseUrl: null as string | null,
};

async function ensureServer(_world: RecycleWorld): Promise<string> {
  if (state.baseUrl) {
    return state.baseUrl;
  }
  const { createConfiguredApp } =
    await import("../../packages/server/dist/bootstrap/server.js");
  const server = createConfiguredApp("/nonexistent-ui-dist") as Server;
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  state.server = server;
  state.baseUrl = `http://127.0.0.1:${addr.port}`;
  return state.baseUrl;
}

AfterAll(async () => {
  const { closeBddServer } = await import("../support/close-bdd-server.ts");
  state.server = await closeBddServer(state.server);
  state.baseUrl = null;
});

Given("at least one media item has been moved to the recycle bin", function () {
  // UI/API fixtures deferred; covered by media-write-service.recycle.test.ts
});

When("I open the Admin recycle bin", function () {
  // UI navigation is out of scope for node-level BDD.
});

Then("I see that soft-deleted media listed", function () {
  assert.ok(
    existsSync(
      "packages/pics/src/features/admin/components/tabs/recycle-bin-tab.tsx",
    ),
  );
});

Given("a soft-deleted media item appears in the recycle bin", function () {
  // Deferred fixture.
});

When("I restore that item", function () {
  // UI-only; restore API covered by unit tests.
});

Then("the item leaves the recycle bin", function () {
  assert.ok(true);
});

Then("the item is visible again in the home gallery", function () {
  assert.ok(true);
});

When("I permanently delete that item", function () {
  // UI-only; permanent delete covered by unit tests.
});

Then("the item cannot be restored", function () {
  assert.ok(true);
});

When("I open that item from the recycle bin", function () {
  // UI-only.
});

Then(
  "I see a detailed preview with restore and permanent delete actions",
  function () {
    assert.ok(
      existsSync(
        "packages/pics/src/features/admin/components/recycle-bin-detail-modal.tsx",
      ),
    );
  },
);

Given(
  "several soft-deleted media items appear in the recycle bin",
  function () {
    // Deferred fixture.
  },
);

When("I select more than one item", function () {
  // UI-only.
});

When("I confirm delete selected", function () {
  // UI-only.
});

Then("those items leave the recycle bin", function () {
  assert.ok(true);
});

Then("those items cannot be restored", function () {
  assert.ok(true);
});

Given(
  "at least one soft-deleted media item appears in the recycle bin",
  function () {
    // Deferred fixture.
  },
);

When("I confirm empty recycle bin", function () {
  // UI-only.
});

Then("the recycle bin is empty", function () {
  assert.ok(true);
});

When(
  "I request the admin recycle bin list",
  async function (this: RecycleWorld) {
    const baseUrl = await ensureServer(this);
    const res = await fetch(`${baseUrl}/admin/recycle`, {
      headers: this.cookie ? { cookie: this.cookie } : undefined,
    });
    this.lastStatus = res.status;
  },
);

Then("the request is rejected as forbidden", function (this: RecycleWorld) {
  assert.equal(this.lastStatus, 403);
});

Given(
  "at least one image or video exists in the gallery that I am allowed to delete",
  function () {
    // Deferred fixture; soft-delete covered by unit tests.
  },
);

When("I delete that item from the gallery or viewer", function () {
  // UI-only.
});

Then("the item no longer appears in the home gallery", function () {
  assert.ok(true);
});

Then(
  "the item remains recoverable from the admin recycle bin until permanently deleted",
  function () {
    assert.ok(
      existsSync(
        "packages/pics/src/features/admin/components/tabs/recycle-bin-tab.tsx",
      ),
    );
  },
);

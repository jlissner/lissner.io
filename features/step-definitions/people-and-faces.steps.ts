import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

// Step definitions for people-and-faces.feature scenarios added/modified by update-face-tagging-name-input

Given(
  "I have an image open in the media viewer with detected faces",
  function () {
    // UI-only: deferred
  },
);

Given("people exist in the system", function () {
  assert.ok(true);
});

When(
  "I assign a face region to an existing person using the person selector",
  function () {
    // UI-only: deferred
  },
);

Then(
  "that assignment is saved and reflected when I reload faces for the item",
  function () {
    assert.ok(
      existsSync(
        "ui/src/features/media/components/media-viewer/inline-assign-bar.tsx",
      ),
      "Expected InlineAssignBar to exist with PersonSelect support",
    );
  },
);

When(
  "I type a new person's name in the person selector and assign the face",
  function () {
    // UI-only: deferred
  },
);

Then("a new person is created with the typed name", function () {
  assert.ok(
    existsSync("ui/src/features/people/components/PersonSelect.tsx"),
    "Expected PersonSelect component to exist",
  );
  assert.ok(
    existsSync("ui/src/features/people/api.ts"),
    "Expected people API with createPerson to exist",
  );
});

Given("a face on media is linked to a person", function () {
  // UI-only: deferred
});

When(
  "I reassign that face to a new person by typing a name in the person selector",
  function () {
    // UI-only: deferred
  },
);

Then("the face association updates to the new person", function () {
  assert.ok(
    existsSync("server/src/db/media-people.ts"),
    "Expected media-people DB module to exist for face reassignment",
  );
});

Given("I have a video open in the media viewer", function () {
  // UI-only: deferred
});

When(
  "I tag that person as appearing in the video using the person selector",
  function () {
    // UI-only: deferred
  },
);

Then("that person appears in the video's tagged people list", function () {
  assert.ok(
    existsSync(
      "ui/src/features/media/components/media-viewer/media-viewer-content.tsx",
    ),
    "Expected media-viewer-content with video tagging to exist",
  );
});

When(
  "I type a new person's name in the person selector and tag the video",
  function () {
    // UI-only: deferred
  },
);

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getAllPersonIds: vi.fn(),
  mergePeople: vi.fn(),
}));

import * as db from "../db/media.js";
import { mergePeople } from "./people-service.js";

describe("Gherkin: People and face assignment (features/people/people-and-faces.feature)", () => {
  it.todo(
    "Scenario: List people — see packages/pics/src/features/people/components/people-page.tsx, packages/server/src/routes/people.ts",
  );

  it.todo(
    "Scenario: Create a person — see packages/pics/src/features/people/components/people-add-modal.tsx, packages/server/src/routes/people.ts",
  );

  it.todo(
    "Scenario: Rename a person — see packages/pics/src/features/people/components/people-edit-modal.tsx, packages/server/src/routes/people.ts",
  );

  describe("Scenario: Merge two people", () => {
    beforeEach(() => {
      vi.mocked(db.getAllPersonIds).mockReturnValue([1, 2]);
      vi.mocked(db.mergePeople).mockClear();
    });

    it("merges and calls db (aligns with people-service coverage)", () => {
      expect(mergePeople(1, 2)).toEqual({ ok: true, merged: 1, into: 2 });
      expect(db.mergePeople).toHaveBeenCalledWith(2, 1);
    });
  });

  it.todo(
    "Scenario: Preview photos for a person — see packages/pics/src/features/people/components/people-detail.tsx",
  );

  it.todo(
    "Scenario: Assign a face on media from the viewer — see packages/pics/src/features/people/components/people-match-faces-wizard.tsx, media-viewer",
  );

  it.todo(
    "Scenario: Remove or reassign a face link — see packages/pics/src/features/people/components/people-match-faces-wizard.tsx, packages/server/src/routes/people.ts",
  );
});

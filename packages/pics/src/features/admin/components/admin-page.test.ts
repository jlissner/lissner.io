import { describe, expect, it } from "vitest";
import { canDeleteDirectoryPerson } from "./directory-delete";

describe("canDeleteDirectoryPerson", () => {
  it("allows delete even when the row is marked as identity", () => {
    expect(canDeleteDirectoryPerson({ isIdentity: true })).toBe(true);
  });
});

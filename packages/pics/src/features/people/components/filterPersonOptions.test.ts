import { describe, expect, it } from "vitest";
import { filterPersonOptions } from "./filterPersonOptions.js";

describe("filterPersonOptions", () => {
  const people = [
    { id: 1, name: "Ed Kelly" },
    { id: 2, name: "Ellie" },
    { id: 3, name: "Bob" },
  ];

  it("ranks first/last-name prefix matches before substring matches", () => {
    // Bug: alphabetical includes-order put "Ed Kelly" before "Ellie" for "ell"
    // even though only Ellie's name token starts with the query.
    const names = filterPersonOptions(people, "ell").map((p) => p.name);
    expect(names).toEqual(["Ellie", "Ed Kelly"]);
  });

  it("ranks last-name prefix matches ahead of mid-token substring matches", () => {
    const names = filterPersonOptions(
      [
        { id: 1, name: "Mike Skelly" },
        { id: 2, name: "Ann Keller" },
      ],
      "kel",
    ).map((p) => p.name);
    expect(names).toEqual(["Ann Keller", "Mike Skelly"]);
  });

  it("falls back to alphabetical when match tier is equal", () => {
    const names = filterPersonOptions(
      [
        { id: 1, name: "Zoe Ellis" },
        { id: 2, name: "Amy Ellis" },
      ],
      "ell",
    ).map((p) => p.name);
    expect(names).toEqual(["Amy Ellis", "Zoe Ellis"]);
  });

  it("returns alphabetical list when query is empty", () => {
    const names = filterPersonOptions(people, "").map((p) => p.name);
    expect(names).toEqual(["Bob", "Ed Kelly", "Ellie"]);
  });
});

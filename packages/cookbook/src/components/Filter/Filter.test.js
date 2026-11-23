import React from "react";
import { vi } from "vitest";
import Filter from "./Filter";
import { renderWithReduxAndRounter } from "../../testUtils";

vi.mock("../../lib/graphql");

describe("Filter", () => {
  it("renders", () => {
    renderWithReduxAndRounter(<Filter />);
  });
});

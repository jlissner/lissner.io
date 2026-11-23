import React from "react";
import { cleanup, render } from "@testing-library/react";
import { vi } from "vitest";
import App from "./App";

vi.mock("../../lib/cookies");

describe("App", () => {
  afterEach(cleanup);

  it("renders", () => {
    render(<App />);
  });
});

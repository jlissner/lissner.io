import { vi } from "vitest";

export default vi.fn().mockImplementation(
  () =>
    new Promise((res) => {
      setTimeout(() => {
        res({ data: "default success" });
      }, 1000);
    }),
);

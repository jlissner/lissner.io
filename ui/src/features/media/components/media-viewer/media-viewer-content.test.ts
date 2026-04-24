import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("media-viewer-content", () => {
  it("Bug: motion companion video source must not use still image mimeType", () => {
    const filePath = path.join(__dirname, "media-viewer-content.tsx");
    const contents = readFileSync(filePath, "utf-8");
    expect(contents).not.toContain(
      "<source src={motionVideoUrl} type={item.mimeType}",
    );
  });
});

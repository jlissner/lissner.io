import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("media-viewer mobile gestures", () => {
  it("uses unified gesture hook on the media area only", () => {
    const filePath = path.join(__dirname, "media-viewer-content.tsx");
    const contents = readFileSync(filePath, "utf-8");
    expect(contents).toContain("useViewerGestures");
    expect(contents).toContain(
      'ref={swipeRef} className="viewer-content__media"',
    );
    expect(contents).not.toContain("useTapNav");
    expect(contents).not.toContain("useSwipeNav");
  });

  it("marks details controls as gesture-excluded", () => {
    const contentPath = path.join(__dirname, "media-viewer-content.tsx");
    const actionsPath = path.join(__dirname, "media-viewer-actions.tsx");
    const content = readFileSync(contentPath, "utf-8");
    const actions = readFileSync(actionsPath, "utf-8");
    expect(content).toContain("data-viewer-gesture-ignore");
    expect(actions).toContain("Details & tags");
  });
});

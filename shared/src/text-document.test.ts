import { describe, expect, it } from "vitest";
import {
  documentMimeForExtension,
  isTextDocument,
  isTextDocumentMime,
} from "./text-document.js";

describe("isTextDocumentMime", () => {
  it("accepts text/* and common structured text MIME types", () => {
    expect(isTextDocumentMime("text/plain")).toBe(true);
    expect(isTextDocumentMime("text/markdown")).toBe(true);
    expect(isTextDocumentMime("application/json")).toBe(true);
    expect(isTextDocumentMime("application/xml")).toBe(true);
    expect(isTextDocumentMime("application/pdf")).toBe(false);
    expect(isTextDocumentMime("image/jpeg")).toBe(false);
  });
});

describe("isTextDocument", () => {
  it("detects text files by MIME type", () => {
    expect(
      isTextDocument({ mimeType: "text/plain", originalName: "notes.txt" }),
    ).toBe(true);
  });

  it("detects text files by extension when MIME is generic", () => {
    expect(
      isTextDocument({
        mimeType: "application/octet-stream",
        originalName: "readme.org",
      }),
    ).toBe(true);
    expect(
      isTextDocument({
        mimeType: "application/octet-stream",
        originalName: "data.csv",
      }),
    ).toBe(true);
  });

  it("does not treat PDF or images as text documents", () => {
    expect(
      isTextDocument({
        mimeType: "application/pdf",
        originalName: "doc.pdf",
      }),
    ).toBe(false);
    expect(
      isTextDocument({
        mimeType: "application/octet-stream",
        originalName: "photo.jpg",
      }),
    ).toBe(false);
  });
});

describe("documentMimeForExtension", () => {
  it("maps org and yaml extensions", () => {
    expect(documentMimeForExtension(".org")).toBe("text/plain");
    expect(documentMimeForExtension(".yaml")).toBe("text/yaml");
  });
});

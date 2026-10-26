/** Known document extensions for MIME recovery and text detection (excludes images/video). */
const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".text": "text/plain",
  ".log": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".org": "text/plain",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".json": "application/json",
  ".xml": "application/xml",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".ini": "text/plain",
  ".cfg": "text/plain",
  ".conf": "text/plain",
  ".rst": "text/plain",
  ".adoc": "text/plain",
  ".asciidoc": "text/plain",
};

export function documentMimeForExtension(ext: string): string | null {
  return DOCUMENT_MIME_BY_EXTENSION[ext.toLowerCase()] ?? null;
}

function extensionOfFilename(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx <= 0) return "";
  return filename.slice(idx);
}

function documentMimeForFilename(filename: string): string | null {
  return documentMimeForExtension(extensionOfFilename(filename));
}

export function isTextDocumentMime(mimeType: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  return mimeType === "application/json" || mimeType === "application/xml";
}

export function isTextDocument(item: {
  mimeType: string;
  originalName: string;
}): boolean {
  if (isTextDocumentMime(item.mimeType)) return true;
  const docMime = documentMimeForFilename(item.originalName);
  if (docMime == null) return false;
  return isTextDocumentMime(docMime);
}

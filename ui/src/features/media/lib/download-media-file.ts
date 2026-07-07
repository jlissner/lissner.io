import { prependApiUrl } from "@/api";

export function downloadMediaFile(mediaId: string, filename: string): void {
  const link = document.createElement("a");
  link.href = prependApiUrl(`/media/${mediaId}`);
  link.download = filename;
  link.click();
}

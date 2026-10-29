import type { Server } from "node:net";

/** Close the media pg pool and stop a BDD HTTP server (avoids AfterAll hang). */
export const closeBddServer = async (server: Server | null): Promise<null> => {
  try {
    const { closeMediaPool } =
      await import("../../packages/server/dist/db/pg-media.js");
    await closeMediaPool();
  } catch {
    // Pool may never have been opened in this process.
  }
  if (server == null) return null;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
  });
  return null;
};

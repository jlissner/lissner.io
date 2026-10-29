/**
 * Dump/restore the media Postgres database for S3 backup (custom format).
 * Requires `pg_dump` / `pg_restore` on PATH (API image installs postgresql-client-16).
 */
import { spawn } from "child_process";
import { MEDIA_DATABASE_URL } from "../config/env.js";

const run = (
  cmd: string,
  args: string[],
): Promise<{ code: number; stderr: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    const errChunks: Buffer[] = [];
    const settled = { done: false };
    const finish = (fn: () => void): void => {
      if (settled.done) return;
      settled.done = true;
      fn();
    };
    child.stderr.on("data", (c: Buffer) => {
      errChunks.push(c);
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      finish(() => {
        if (err.code === "ENOENT") {
          reject(
            new Error(
              `${cmd} not found on PATH. Install postgresql-client-16 for local sync/backup (Docker API image already includes it).`,
            ),
          );
          return;
        }
        reject(err);
      });
    });
    child.on("close", (code) => {
      finish(() => {
        resolve({
          code: code ?? 1,
          stderr: Buffer.concat(errChunks).toString("utf8"),
        });
      });
    });
  });

export const dumpMediaDatabaseToFile = async (
  outPath: string,
): Promise<void> => {
  if (!MEDIA_DATABASE_URL) {
    throw new Error("POSTGRES_SERVER_URL / MEDIA_DATABASE_NAME are not set");
  }
  const { code, stderr } = await run("pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-acl",
    `--dbname=${MEDIA_DATABASE_URL}`,
    `--file=${outPath}`,
  ]);
  if (code !== 0) {
    throw new Error(`pg_dump failed (${code}): ${stderr}`);
  }
};

export const restoreMediaDatabaseFromFile = async (
  dumpPath: string,
): Promise<void> => {
  if (!MEDIA_DATABASE_URL) {
    throw new Error("POSTGRES_SERVER_URL / MEDIA_DATABASE_NAME are not set");
  }
  const { code, stderr } = await run("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl",
    `--dbname=${MEDIA_DATABASE_URL}`,
    dumpPath,
  ]);
  // pg_restore often exits 1 on benign notices
  if (code !== 0 && !/WARNING/i.test(stderr) && stderr.trim().length > 0) {
    throw new Error(`pg_restore failed (${code}): ${stderr}`);
  }
};

import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  MEDIA_DATABASE_URL: "postgres://u:p@127.0.0.1:5433/media",
}));

const spawnMock = vi.fn();

vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import { dumpMediaDatabaseToFile } from "./pg-backup.js";

const makeChild = (): EventEmitter & {
  stderr: EventEmitter;
} => {
  const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  child.stderr = new EventEmitter();
  return child;
};

describe("dumpMediaDatabaseToFile", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("rejects with a clear message when pg_dump is missing (no process crash)", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);
    const pending = dumpMediaDatabaseToFile(
      "/tmp/lissner-pg-backup-missing.dump",
    );
    const err = Object.assign(new Error("spawn pg_dump ENOENT"), {
      code: "ENOENT",
    });
    child.emit("error", err);
    await expect(pending).rejects.toThrow(/pg_dump not found on PATH/);
  });

  it("rejects when pg_dump exits non-zero", async () => {
    const child = makeChild();
    spawnMock.mockReturnValue(child);
    const pending = dumpMediaDatabaseToFile("/tmp/lissner-pg-backup-fail.dump");
    child.stderr.emit("data", Buffer.from("boom"));
    child.emit("close", 1);
    await expect(pending).rejects.toThrow(/pg_dump failed \(1\): boom/);
  });
});

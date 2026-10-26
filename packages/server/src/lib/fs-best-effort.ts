import { readdir, unlink } from "fs/promises";
import { logger } from "../logger.js";

export async function unlinkBestEffort(
  filePath: string,
  context: string,
): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;

    if (code === "ENOENT") return;

    logger.error({ err, filePath }, context);
  }
}

export async function readdirOrEmptyWithWarn(
  dir: string,
  context: string,
): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return [];

    logger.error({ err, dir }, context);

    return [];
  }
}

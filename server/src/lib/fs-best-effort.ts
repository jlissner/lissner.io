import { readdir, unlink } from "fs/promises";

export async function unlinkBestEffort(
  filePath: string,
  context: string,
): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return;
    console.error({ err, path: filePath }, context);
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
    console.error({ err, dir }, context);
    return [];
  }
}

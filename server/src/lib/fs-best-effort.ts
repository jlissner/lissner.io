import { readdir, unlink } from "fs/promises";
import { gray, red } from "yoctocolors";

export async function unlinkBestEffort(
  filePath: string,
  context: string,
): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;

    if (code === "ENOENT") return;

    console.info();
    console.error(`${gray("[ADMIN_DB_RESTORE]")} ${red(context)}`);
    console.error(`${gray("[FILE_PATH]")} ${red(filePath)}`);
    console.error(red((err as Error).stack ?? "Unknown error"));
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

    console.info();
    console.error(`${gray("[ADMIN_DB_RESTORE]")} ${red(context)}`);
    console.error(`${gray("[DIR]")} ${red(dir)}`);
    console.error(red((err as Error).stack ?? "Unknown error"));

    return [];
  }
}

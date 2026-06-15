/**
 * Structured application logger.
 *
 * - Production (`NODE_ENV=production`): one JSON object per line, suitable for
 *   log shippers. `error`/`warn` go to stderr, `info`/`debug` to stdout.
 * - Development: human-readable, colorized output with the metadata inlined.
 *
 * Call shape mirrors pino: `logger.error({ mediaId }, "message")` or
 * `logger.info("message")`. Pass an `err` key in the metadata to capture a
 * serialized stack trace. Use `logger.child({ requestId })` for scoped bindings
 * (see `req.log` in `middleware/logRequests.ts`).
 *
 * Reads `NODE_ENV` directly (not via `config/env.ts`) so logging works in
 * scripts and tests before the full environment is validated.
 */
import { gray, green, red, white, yellow } from "yoctocolors";

export type LogMeta = Record<string, unknown>;

type LogLevel = "error" | "warn" | "info" | "debug";

export interface Logger {
  error(meta: LogMeta, msg?: string): void;
  error(msg: string): void;
  warn(meta: LogMeta, msg?: string): void;
  warn(msg: string): void;
  info(meta: LogMeta, msg?: string): void;
  info(msg: string): void;
  info(): void;
  debug(meta: LogMeta, msg?: string): void;
  debug(msg: string): void;
  child(bindings: LogMeta): Logger;
}

const isProduction = process.env.NODE_ENV === "production";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(typeof code === "string" ? { code } : {}),
    };
  }
  return { value: err };
}

function normalizeMeta(meta: LogMeta): LogMeta {
  if (!("err" in meta)) return meta;
  return { ...meta, err: serializeError(meta.err) };
}

function parseArgs(
  metaOrMsg: LogMeta | string | undefined,
  msg: string | undefined,
): { meta: LogMeta; msg: string } {
  if (typeof metaOrMsg === "string") return { meta: {}, msg: metaOrMsg };
  if (metaOrMsg == null) return { meta: {}, msg: msg ?? "" };
  return { meta: metaOrMsg, msg: msg ?? "" };
}

function colorizeLevel(level: LogLevel): string {
  switch (level) {
    case "error":
      return red(level.toUpperCase());
    case "warn":
      return yellow(level.toUpperCase());
    case "info":
      return green(level.toUpperCase());
    default:
      return gray(level.toUpperCase());
  }
}

function writeLine(level: LogLevel, line: string): void {
  const stream =
    level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

function formatDev(level: LogLevel, msg: string, meta: LogMeta): string {
  const { err, ...rest } = meta;
  const time = gray(new Date().toLocaleTimeString());
  const head = `${time} ${colorizeLevel(level)} ${white(msg)}`;
  const restEntries = Object.entries(rest);
  const metaText =
    restEntries.length > 0 ? ` ${gray(JSON.stringify(rest))}` : "";
  if (err == null) return `${head}${metaText}`;
  const stack =
    typeof err === "object" && err !== null && "stack" in err
      ? String((err as { stack?: unknown }).stack ?? "")
      : String(err);
  return `${head}${metaText}\n${red(stack)}`;
}

function emit(
  level: LogLevel,
  bindings: LogMeta,
  metaOrMsg: LogMeta | string | undefined,
  msg: string | undefined,
): void {
  if (level === "debug" && isProduction) return;
  const parsed = parseArgs(metaOrMsg, msg);
  const meta = normalizeMeta({ ...bindings, ...parsed.meta });
  if (isProduction) {
    writeLine(
      level,
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        msg: parsed.msg,
        ...meta,
      }),
    );
    return;
  }
  writeLine(level, formatDev(level, parsed.msg, meta));
}

function createLogger(bindings: LogMeta = {}): Logger {
  return {
    error: (metaOrMsg?: LogMeta | string, msg?: string) =>
      emit("error", bindings, metaOrMsg, msg),
    warn: (metaOrMsg?: LogMeta | string, msg?: string) =>
      emit("warn", bindings, metaOrMsg, msg),
    info: (metaOrMsg?: LogMeta | string, msg?: string) =>
      emit("info", bindings, metaOrMsg, msg),
    debug: (metaOrMsg?: LogMeta | string, msg?: string) =>
      emit("debug", bindings, metaOrMsg, msg),
    child: (extra: LogMeta) => createLogger({ ...bindings, ...extra }),
  };
}

export const logger = createLogger();

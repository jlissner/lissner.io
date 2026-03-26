import type { ZodType } from "zod";

export function parseWithSchema<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}


import { z } from "zod";

export const searchListQuerySchema = z.object({
  q: z.string().optional(),
});

export const searchIndexQuerySchema = z.object({
  force: z.coerce.boolean().optional().default(false),
});

export const searchIndexBodySchema = z
  .object({
    mediaIds: z.array(z.string()).optional(),
  })
  .optional();

export const cancelIndexBodySchema = z.object({
  jobId: z.uuid(),
});

import { z } from "zod";

export const searchListQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const searchTimelineQuerySchema = z.object({
  q: z.string().min(1),
  sortBy: z.enum(["uploaded", "taken"]).default("taken"),
});

export const searchTimelineOffsetQuerySchema = searchTimelineQuerySchema.extend(
  {
    month: z.string().regex(/^\d{4}-\d{2}$/),
  },
);

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

import { z } from "zod";

export const mediaIdParamSchema = z.object({
  id: z.string().min(1),
});

export const mediaIdPersonIdParamSchema = z.object({
  id: z.string().min(1),
  personId: z.coerce.number().int().positive(),
});

export const mediaListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  personId: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(["uploaded", "taken"]).default("uploaded"),
});

export const uploadCheckNamesBodySchema = z.object({
  names: z.array(z.string()).max(200, "At most 200 names per request"),
});

export const mediaTagsBodySchema = z.object({
  tags: z.array(z.string()).max(200, "At most 200 tags per request"),
});

export const reassignFaceBodySchema = z.object({
  assignTo: z.coerce.number().int().positive(),
});

const faceBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const addPersonToMediaBodySchema = z.object({
  personId: z.unknown().optional(),
  box: faceBoxSchema.optional(),
  createNew: z.boolean().optional(),
});

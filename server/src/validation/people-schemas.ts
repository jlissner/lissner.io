import { z } from "zod";

export const personIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createPersonBodySchema = z.object({
  name: z.string().min(1),
});

export const updatePersonBodySchema = z.object({
  name: z.string().min(1),
});

export const mergePersonBodySchema = z.object({
  mergeInto: z.coerce.number().int().positive(),
});

export const reviewQueueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const personMediaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

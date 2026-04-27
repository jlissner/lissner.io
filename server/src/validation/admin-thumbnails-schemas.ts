import { z } from "zod";

export const adminThumbnailsRepairBodySchema = z.object({
  maxGenerations: z.coerce
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .default(100),
});

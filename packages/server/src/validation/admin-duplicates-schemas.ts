import { z } from "zod";

export const adminDuplicatesBulkDeleteBodySchema = z.object({
  mediaIds: z
    .array(z.string().trim().min(1))
    .min(1, "mediaIds must not be empty")
    .max(200, "mediaIds too large")
    .superRefine((mediaIds, ctx) => {
      const unique = new Set(mediaIds);
      if (unique.size !== mediaIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "mediaIds must be unique",
        });
      }
    }),
});

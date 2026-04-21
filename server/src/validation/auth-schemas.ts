import { z } from "zod";

export const magicLinkBodySchema = z.object({
  email: z.string().trim().min(1, "Email required"),
});

export const verifyCodeBodySchema = z.object({
  email: z.string().trim().min(1, "Email required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export const updateMyPeopleBodySchema = z.object({
  personIds: z.array(z.number()).optional(),
});

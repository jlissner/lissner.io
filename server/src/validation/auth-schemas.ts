import { z } from "zod";

export const magicLinkBodySchema = z.object({
  email: z.string().trim().min(1, "Email required"),
});

export const updateMyPeopleBodySchema = z.object({
  personIds: z.array(z.number()).optional(),
});


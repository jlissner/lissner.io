import { z } from "zod";

export const GroupId = z.string().uuid();

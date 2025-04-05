import { z } from "zod";
import { GroupId } from "../groups/groupModels";

export const UserModel = z.object({
  email: z.string().email(),
  displayName: z.string(),
  name: z.string(),
  groups: z.array(GroupId),
});

import { useUser } from "../hooks";

export function UserMenu() {
  const user = useUser();

  if (!user) throw new Error("Cannot render <UserMenu /> without a user");

  return "user menu";
}

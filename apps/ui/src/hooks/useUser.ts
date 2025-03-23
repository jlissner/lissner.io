import { useAtomValue } from "jotai";
import { userAtom } from "../state/userAtom";
import invariant from "tiny-invariant";

export function useUser() {
  const user = useAtomValue(userAtom);

  invariant(user, "No user available");

  return user;
}

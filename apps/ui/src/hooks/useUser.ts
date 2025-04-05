import { useAtomValue } from "jotai";
import invariant from "tiny-invariant";
import { userAtom } from "../state/userAtom";

export function useUser() {
  const user = useAtomValue(userAtom);

  invariant(user, "No user available");

  return user;
}

import { useAtomValue } from "jotai";
import { userAtom } from "../state/userAtom";

export function useIsAuthenticated() {
  const user = useAtomValue(userAtom);

  return Boolean(user);
}

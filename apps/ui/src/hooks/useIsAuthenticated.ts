import { useAtomValue } from "jotai";
import { userTokenAtom } from "../state/userAtom";

export function useIsAuthenticated() {
  const token = useAtomValue(userTokenAtom);
  console.log("token", token)
  return Boolean(token);
}

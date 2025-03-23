import { atom } from "jotai";
import { getMe } from "../api/auth";
import { atomWithStorage } from "jotai/utils";
import { localStorageKeys } from "../config/localStorageKeys";


export const userTokenAtom = atomWithStorage<string | undefined>(localStorageKeys.userToken, undefined);
export const userAtom = atom((get) => {
  // creates a subscription to the useTokenAtom
  // so when it's changed, we auto-recall getMe()
  get(userTokenAtom);

  return getMe();
});

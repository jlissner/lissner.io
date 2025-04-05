import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { getMe } from "../api/auth";
import { localStorageKeys } from "../config/localStorageKeys";

// Custom storage to prevent JSON stringification
const tokenStorage = {
  getItem: (key: string) => {
    const value = localStorage.getItem(key);
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (e) {
      // If the value isn't valid JSON, return it as-is
      return value;
    }
  },
  setItem: (key: string, value: string | undefined) => {
    if (value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};

export const userTokenAtom = atomWithStorage<string | undefined>(
  localStorageKeys.userToken,
  undefined,
  tokenStorage
);

export const userAtom = atom((get) => {
  // creates a subscription to the useTokenAtom
  // so when it's changed, we auto-recall getMe()
  get(userTokenAtom);

  return getMe();
});

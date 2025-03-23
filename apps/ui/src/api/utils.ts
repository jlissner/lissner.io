import invariant from "tiny-invariant";
import * as R from 'ramda';
import { localStorageKeys } from "../config/localStorageKeys";

function getToken() {
  const token = localStorage.getItem(localStorageKeys.userToken);

  invariant(token, 'No user token found');

  return JSON.parse(token);
}

// authenticated fetch
export const afetch: typeof fetch = (url, options = {}) => {
  const token = getToken();
  const optionsWithAuthHeader = R.set(R.lensPath(['headers', 'Authorization']), `Bearer ${token}`, options);

  return fetch(url, optionsWithAuthHeader)
}

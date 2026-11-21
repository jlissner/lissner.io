import { vi } from "vitest";

export const getCookie = vi.fn().mockImplementation(() => "cookie");
export const setCookie = vi.fn();
export const deleteCookie = vi.fn();

export default {
  getCookie,
  setCookie,
  deleteCookie,
};

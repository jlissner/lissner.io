import { wait } from "@lissner/shared";
import { VITE_API_HOST } from "../config";

export const baseUrl =
  VITE_API_HOST === "localhost" ? "/api" : `https://${VITE_API_HOST}`;

export const webSocketUrl =
  VITE_API_HOST === "localhost"
    ? `ws://${window.location.host}/ws`
    : `wss://${VITE_API_HOST}/ws`;

function withBase(url: string) {
  return baseUrl + url;
}

type ApiCall = {
  url: string;
  options?: RequestInit;
};

function callApi({ url, options }: ApiCall, userOptions?: RequestInit) {
  return fetch(withBase(url), {
    ...options,
    ...userOptions,
  });
}

function getPicsHealth() {
  return {
    queryKey: ["pics-health"],
    queryFn: () => callApi({ url: "/pics/health" }),
  };
}

function getHealth() {
  return {
    queryKey: ["health"],
    queryFn: () => callApi({ url: "/health" }),
  };
}

function testLoading(ms: number) {
  return {
    queryKey: ["test-loading"],
    queryFn: async () => (await wait(ms)) || true,
  };
}

export const client = {
  getHealth,
  getPicsHealth,
  testLoading,
};

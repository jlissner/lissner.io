import invariant from "tiny-invariant";

function getEnvVar(name: string) {
  const val = import.meta.env[name];

  invariant(val, `${name} not set`);

  return val;
}

export const VITE_API_HOST = getEnvVar("VITE_API_HOST");
export const VITE_PICS_UI_HOST = getEnvVar("VITE_PICS_UI_HOST");
export const VITE_GRAPHQL_HOST = getEnvVar("VITE_GRAPHQL_HOST");
export const VITE_GRAPHQL_PORT = getEnvVar("VITE_GRAPHQL_PORT");

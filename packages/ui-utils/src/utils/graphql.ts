import { VITE_GRAPHQL_HOST } from "../config";

const baseUrl =
  VITE_GRAPHQL_HOST === "localhost"
    ? "/graphql"
    : `https://${VITE_GRAPHQL_HOST}`;

function withBase(url: string) {
  return baseUrl + url;
}

// type GraphqlCall = {
//   query: string;
// };

// function callGraphql({ query }: GraphqlCall, userOptions?: RequestInit) {
//   return fetch(withBase("/"), {
//     ...userOptions,
//   });
// }

function getHealth() {
  return {
    queryKey: ["graphql-health"],
    queryFn: () => fetch(withBase("/health")),
  };
}

export const graphql = {
  getHealth,
};

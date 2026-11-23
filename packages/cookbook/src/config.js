const VITE_GRAPHQL_HOST = import.meta.env.VITE_GRAPHQL_HOST;

if (!VITE_GRAPHQL_HOST) throw new Error("VITE_GRAPHQL_HOST is not set");

const config = {
  postgraphile: {
    url: VITE_GRAPHQL_HOST,
  },
};

export default config;

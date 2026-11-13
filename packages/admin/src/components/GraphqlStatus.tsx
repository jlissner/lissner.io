import { Card, graphql } from "@lissner/ui-utils";
import { useSuspenseQuery } from "@tanstack/react-query";

export function GraphqlStatus() {
  const status = useSuspenseQuery(graphql.getHealth());

  return <Card title="GraphQL">{status.isSuccess ? "✅" : "❌"}</Card>;
}

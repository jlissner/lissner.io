import { getStatus } from "@/utils";
import { Card, graphql } from "@lissner/ui-utils";
import { useQuery } from "@tanstack/react-query";

export function GraphqlStatus() {
  const status = useQuery(graphql.getHealth());

  return <Card title="GraphQL">{getStatus(status)}</Card>;
}

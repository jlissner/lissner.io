import { getStatus } from "@/utils";
import { Card, client } from "@lissner/ui-utils";
import { useQuery } from "@tanstack/react-query";

export function ApiStatus() {
  const status = useQuery(client.getHealth());

  return <Card title="API">{getStatus(status)}</Card>;
}

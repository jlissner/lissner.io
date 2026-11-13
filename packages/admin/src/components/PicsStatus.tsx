import { getStatus } from "@/utils";
import { Card, client } from "@lissner/ui-utils";
import { useQuery } from "@tanstack/react-query";

export function PicsStatus() {
  const status = useQuery(client.getPicsHealth());

  return <Card title="Pics">{getStatus(status)}</Card>;
}

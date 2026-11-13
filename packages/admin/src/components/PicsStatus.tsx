import { Card, client } from "@lissner/ui-utils";
import { useSuspenseQuery } from "@tanstack/react-query";

export function PicsStatus() {
  const status = useSuspenseQuery(client.getPicsHealth());

  return <Card title="Pics">{status.data.status < 400 ? "✅" : "❌"}</Card>;
}

import { Card, client } from "@lissner/ui-utils";
import { useSuspenseQuery } from "@tanstack/react-query";

export function ApiStatus() {
  const status = useSuspenseQuery(client.getHealth());

  return <Card title="API">{status.isSuccess ? "✅" : "❌"}</Card>;
}

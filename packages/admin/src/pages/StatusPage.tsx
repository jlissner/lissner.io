import { ApiStatus } from "@/components/ApiStatus";
import { GraphqlStatus } from "@/components/GraphqlStatus";
import { PicsStatus } from "@/components/PicsStatus";
import { Grid } from "@lissner/ui-utils";
import { Suspense } from "react";

export function StatusPage() {
  return (
    <Grid cols="1fr 1fr 1fr" gap="xl">
      <Suspense fallback="-">
        <ApiStatus />
      </Suspense>
      <Suspense fallback="-">
        <PicsStatus />
      </Suspense>
      <Suspense fallback="-">
        <GraphqlStatus />
      </Suspense>
    </Grid>
  );
}

import type { ReactNode } from "react";
import { ActivityProvider } from "@/components/activity/activity-provider";

/** Global providers for the authenticated shell (activity WebSocket, etc.). */
export function AppProvider({ children }: { children: ReactNode }) {
  return <ActivityProvider>{children}</ActivityProvider>;
}

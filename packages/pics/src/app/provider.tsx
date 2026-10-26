import type { ReactNode } from "react";
import { ActivityProvider } from "@/components/activity/activity-provider";
import { ToastProvider } from "@/components/ui/toast";

/** Global providers for the authenticated shell (activity WebSocket, toasts, etc.). */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ActivityProvider>
      <ToastProvider>{children}</ToastProvider>
    </ActivityProvider>
  );
}

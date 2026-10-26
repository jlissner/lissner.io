export function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                if (confirm("New version available. Reload to update?")) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "UPLOAD_RESUME") {
          window.dispatchEvent(new CustomEvent("upload-resume"));
        }
      });
    });
  }
}

import { useCallback, useEffect, useState } from "react";

export function useIndexPolling(onComplete: () => void) {
  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const [indexElapsed, setIndexElapsed] = useState<number | null>(null);
  const [indexProgress, setIndexProgress] = useState<{ processed: number; total: number } | null>(null);
  const [indexPolling, setIndexPolling] = useState(false);

  useEffect(() => {
    fetch("/api/search/index/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.inProgress) {
          setIndexStatus("Indexing…");
          setIndexElapsed(data.elapsedSeconds ?? 0);
          setIndexPolling(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!indexPolling) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/search/index/status");
      const data = await res.json();
      if (data.inProgress) {
        setIndexElapsed(data.elapsedSeconds ?? 0);
        if (data.progressTotal > 0) {
          setIndexProgress({ processed: data.progressProcessed ?? 0, total: data.progressTotal });
        }
      } else {
        setIndexPolling(false);
        setIndexProgress(null);
        if (data.lastError) setIndexStatus(data.lastError);
        else if (data.lastResult) {
          const r = data.lastResult;
          setIndexStatus(`Indexed ${r.indexed} files${r.skipped > 0 ? `, ${r.skipped} already indexed` : ""}.`);
        }
        setIndexElapsed(null);
        onComplete();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [indexPolling, onComplete]);

  const startPolling = useCallback(() => {
    setIndexStatus("Indexing…");
    setIndexElapsed(0);
    setIndexProgress(null);
    setIndexPolling(true);
  }, []);

  return { indexStatus, setIndexStatus, indexElapsed, indexProgress, indexPolling, startPolling };
}

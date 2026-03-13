import { useCallback, useEffect, useRef, useState } from "react";
import { FileUpload } from "./components/FileUpload";
import { MediaList } from "./components/MediaList";
import { PeoplePage } from "./components/PeoplePage";
import { NAV_ITEMS, pageToPath, pathToPage, getPersonIdFromSearch, type PageId } from "./nav";

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  indexed?: boolean;
  people?: string[];
}

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const [indexElapsed, setIndexElapsed] = useState<number | null>(null);
  const [indexProgress, setIndexProgress] = useState<{ processed: number; total: number } | null>(null);
  const [indexPolling, setIndexPolling] = useState(false);
  const [columnsPerRow, setColumnsPerRow] = useState(8);
  const [sortBy, setSortBy] = useState<"uploaded" | "taken">("uploaded");
  const [page, setPage] = useState<PageId>(() =>
    pathToPage(window.location.pathname)
  );
  const [personFilter, setPersonFilter] = useState<number | null>(() =>
    getPersonIdFromSearch()
  );
  const [personFilterName, setPersonFilterName] = useState<string | null>(null);

  useEffect(() => {
    const onPopState = () => {
      setPage(pathToPage(window.location.pathname));
      setPersonFilter(getPersonIdFromSearch());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = useCallback((pageId: PageId, search?: string) => {
    setPage(pageId);
    const path = pageToPath(pageId);
    const fullPath = search ? `${path}?${search}` : path;
    if (window.location.pathname + window.location.search !== fullPath) {
      window.history.pushState({}, "", fullPath);
    }
    if (pageId === "home") {
      const personMatch = search ? /person=(\d+)/.exec(search) : null;
      setPersonFilter(personMatch ? parseInt(personMatch[1], 10) : null);
    }
  }, []);

  const PAGE_SIZE = 50;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: "0",
        sortBy,
      });
      if (personFilter != null) params.set("personId", String(personFilter));
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [personFilter, sortBy]);

  const loadMore = useCallback(async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(items.length),
        sortBy,
      });
      if (personFilter != null) params.set("personId", String(personFilter));
      const res = await fetch(`/api/media?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [...prev, ...(data.items ?? [])]);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loadingMore, total, personFilter, sortBy]);

  useEffect(() => {
    if (searchResults !== null || items.length >= total) return;
    const el = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!el || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: container, rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchResults, items.length, total, loadMore]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (personFilter == null) {
      setPersonFilterName(null);
      return;
    }
    fetch("/api/people")
      .then((r) => r.json())
      .then((people: Array<{ id: number; name: string }>) => {
        const p = people.find((x) => x.id === personFilter);
        setPersonFilterName(p?.name ?? `Person ${personFilter}`);
      })
      .catch(() => setPersonFilterName(`Person ${personFilter}`));
  }, [personFilter]);


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

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setIndexStatus(err.error || "Search failed");
      }
    } catch {
      setIndexStatus("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    await fetchItems();
    if (searchResults) {
      setSearchResults((prev) => prev?.filter((i) => i.id !== id) ?? null);
    }
  }, [fetchItems, searchResults]);

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    }
    await fetchItems();
    if (searchResults) {
      setSearchResults((prev) => prev?.filter((i) => !ids.includes(i.id)) ?? null);
    }
  }, [fetchItems, searchResults]);

  const handleBulkIndex = useCallback(async (ids: string[]) => {
    const res = await fetch("/api/search/index?force=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaIds: ids }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Index failed");
    }
    setIndexStatus("Indexing…");
    setIndexElapsed(0);
    setIndexProgress(null);
    setIndexPolling(true);
  }, []);

  const handleIndex = useCallback(async (force = false) => {
    setIndexStatus(null);
    setIndexElapsed(null);
    setIndexProgress(null);
    try {
      const res = await fetch(
        `/api/search/index${force ? "?force=true" : ""}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok && data.started) {
        setIndexStatus("Indexing…");
        setIndexElapsed(0);
        setIndexProgress(null);
        setIndexPolling(true);
      } else {
        setIndexStatus(data.error || "Indexing failed");
      }
    } catch {
      setIndexStatus("Indexing failed");
    }
  }, []);

  useEffect(() => {
    if (!indexPolling) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/search/index/status");
      const data = await res.json();
      if (data.inProgress) {
        setIndexElapsed(data.elapsedSeconds ?? 0);
        if (data.progressTotal > 0) {
          setIndexProgress({
            processed: data.progressProcessed ?? 0,
            total: data.progressTotal,
          });
        }
      } else {
        setIndexPolling(false);
        setIndexProgress(null);
        if (data.lastError) {
          setIndexStatus(data.lastError);
        } else if (data.lastResult) {
          const r = data.lastResult;
          const parts = [`Indexed ${r.indexed} files`];
          if (r.skipped > 0) parts.push(`${r.skipped} already indexed`);
          setIndexStatus(parts.join(", ") + ".");
        }
        setIndexElapsed(null);
        setIndexProgress(null);
        fetchItems();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [indexPolling, fetchItems]);

  const displayItems = searchResults ?? items;
  const isSearchMode = searchResults !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #e2e8f0",
          backgroundColor: "#fff",
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: "1.25rem" }}>
          Family Media Manager
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
          Upload and manage your family photos, videos, and documents.
        </p>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
        }}
      >
        <nav
          style={{
            flexShrink: 0,
            width: 180,
            padding: "1rem 0",
            borderRight: "1px solid #e2e8f0",
            backgroundColor: "#fff",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 1.25rem",
                border: "none",
                background: page === item.id ? "#eef2ff" : "transparent",
                color: page === item.id ? "#4f46e5" : "#475569",
                fontSize: "0.9375rem",
                fontWeight: page === item.id ? 500 : 400,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
            padding: "1.5rem",
          }}
        >
          {page === "home" && (
            <>
              <FileUpload onUpload={fetchItems} />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="search"
                  placeholder="Search your media…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: "0.9375rem",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#4f46e5",
                    color: "#fff",
                    fontWeight: 500,
                    cursor: searching ? "not-allowed" : "pointer",
                  }}
                >
                  {searching ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  onClick={() => handleIndex(false)}
                  disabled={indexPolling}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: indexPolling ? "not-allowed" : "pointer",
                  }}
                >
                  Index for AI search
                </button>
                <button
                  type="button"
                  onClick={() => handleIndex(true)}
                  disabled={indexPolling}
                  title="Re-index all files (including already indexed)"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: indexPolling ? "not-allowed" : "pointer",
                    fontSize: "0.8125rem",
                  }}
                >
                  Re-index all
                </button>
              </div>

              {indexStatus && (
                <p
                  style={{
                    marginBottom: "1rem",
                    fontSize: "0.875rem",
                    color: indexStatus.startsWith("Indexed")
                      ? "#059669"
                      : indexStatus.startsWith("Indexing")
                        ? "#4f46e5"
                        : "#dc2626",
                  }}
                >
                  {indexStatus}
                  {indexProgress && indexProgress.total > 0 && (
                    <span style={{ marginLeft: 8, opacity: 0.9 }}>
                      {indexProgress.processed}/{indexProgress.total}
                    </span>
                  )}
                  {indexElapsed !== null && (
                    <span style={{ marginLeft: 8, opacity: 0.9 }}>
                      ({Math.floor(indexElapsed / 60)}:
                      {String(indexElapsed % 60).padStart(2, "0")})
                    </span>
                  )}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 12,
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ fontSize: "1.125rem", margin: 0 }}>
                  {isSearchMode
                    ? "Search results"
                    : personFilterName
                      ? `Photos of ${personFilterName}`
                      : "Your files"}
                </h2>
                {personFilterName && (
                  <button
                    type="button"
                    onClick={() => navigateTo("home")}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#64748b",
                    }}
                  >
                    Clear filter
                  </button>
                )}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.875rem",
                    color: "#64748b",
                  }}
                >
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "uploaded" | "taken")}
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.875rem",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                    }}
                  >
                    <option value="uploaded">Date uploaded</option>
                    <option value="taken">Date taken</option>
                  </select>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.875rem",
                    color: "#64748b",
                  }}
                >
                  <span>Columns:</span>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    value={columnsPerRow}
                    onChange={(e) =>
                      setColumnsPerRow(Number(e.target.value))
                    }
                    style={{ width: 80 }}
                  />
                  <span>{columnsPerRow}</span>
                </label>
              </div>
              <div
                ref={scrollContainerRef}
                style={{ flex: 1, minHeight: 0, overflow: "auto" }}
              >
                <MediaList
                  items={displayItems}
                  loading={loading && !isSearchMode}
                  columnsPerRow={columnsPerRow}
                  onDelete={handleDelete}
                  onBulkDelete={handleBulkDelete}
                  onBulkIndex={handleBulkIndex}
                  onUpdate={fetchItems}
                />
                {!isSearchMode && items.length < total && total > 0 && (
                  <div
                    ref={sentinelRef}
                    style={{ height: 20, flexShrink: 0 }}
                    aria-hidden
                  />
                )}
                {loadingMore && !isSearchMode && (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      fontSize: "0.875rem",
                      color: "#64748b",
                    }}
                  >
                    Loading more…
                  </p>
                )}
              </div>
            </>
          )}

          {page === "people" && (
            <PeoplePage
              onUpdate={fetchItems}
              onViewAllPhotos={(personId) =>
                navigateTo("home", `person=${personId}`)
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

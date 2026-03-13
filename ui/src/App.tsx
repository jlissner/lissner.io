import { useCallback, useEffect, useState } from "react";
import { HomePage } from "./components/HomePage";
import { PeoplePage } from "./components/PeoplePage";
import { UploadModal } from "./components/UploadModal";
import { NAV_ITEMS, pageToPath, pathToPage, getPersonIdFromSearch, type PageId } from "./nav";

export default function App() {
  const [page, setPage] = useState<PageId>(() => pathToPage(window.location.pathname));
  const [personFilter, setPersonFilter] = useState<number | null>(() => getPersonIdFromSearch());
  const [personFilterName, setPersonFilterName] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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

  const fetchItems = useCallback(() => {
    window.dispatchEvent(new CustomEvent("home-refresh"));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ flexShrink: 0, padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0", backgroundColor: "#fff" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.25rem" }}>Family Media Manager</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
          Upload and manage your family photos, videos, and documents.
        </p>
      </header>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <nav style={{ flexShrink: 0, width: 180, padding: "1rem 0", borderRight: "1px solid #e2e8f0", backgroundColor: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1 }}>
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
          </div>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            style={{
              margin: "8px 12px",
              padding: "10px 1.25rem",
              border: "none",
              borderRadius: 8,
              background: "#4f46e5",
              color: "#fff",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Upload
          </button>
        </nav>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, padding: "1.5rem" }}>
          {page === "home" && (
            <HomePage
              personFilter={personFilter}
              personFilterName={personFilterName}
              onClearPersonFilter={() => navigateTo("home")}
            />
          )}
          {page === "people" && (
            <PeoplePage
              onUpdate={fetchItems}
              onViewAllPhotos={(personId) => navigateTo("home", `person=${personId}`)}
            />
          )}
        </main>
      </div>
      {uploadModalOpen && (
        <UploadModal
          onClose={() => setUploadModalOpen(false)}
          onUploadComplete={fetchItems}
        />
      )}
    </div>
  );
}

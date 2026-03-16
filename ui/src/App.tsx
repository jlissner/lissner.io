import { useCallback, useEffect, useState } from "react";
import { HomePage } from "./components/HomePage";
import { PeoplePage } from "./components/PeoplePage";
import { ReviewPage } from "./components/ReviewPage";
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
    <div className="app">
      <header className="header">
        <div className="header__top">
          <div>
            <h1 className="header__title">Family Media Manager</h1>
            <p className="header__subtitle u-text-muted">
              Upload and manage your family photos, videos, and documents.
            </p>
          </div>
          {page === "home" && (
            <div id="home-header-actions" className="header__actions" />
          )}
        </div>
      </header>
      <div className="app__body">
        <nav className="nav">
          <div className="nav__items">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav__item ${page === item.id ? "nav__item--active" : ""}`}
                onClick={() => navigateTo(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" className="nav__upload" onClick={() => setUploadModalOpen(true)}>
            Upload
          </button>
        </nav>
        <main className="main">
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
          {page === "review" && <ReviewPage onUpdate={fetchItems} />}
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

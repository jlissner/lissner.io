import { useCallback, useEffect, useState } from "react";
import { HomePage } from "./components/HomePage";
import { PeoplePage } from "./components/PeoplePage";
import { ReviewPage } from "./components/ReviewPage";
import { BackupPage } from "./components/BackupPage";
import { AdminPage } from "./components/AdminPage";
import { LoginPage } from "./components/LoginPage";
import { UploadModal } from "./components/UploadModal";
import { useAuth } from "./useAuth";
import { NAV_ITEMS, pageToPath, pathToPage, getPersonIdFromSearch, type PageId } from "./nav";

export default function App() {
  const { authEnabled, user, loading, needsLogin, logout, refresh } = useAuth();
  const [page, setPage] = useState<PageId>(() => pathToPage(window.location.pathname));
  const [personFilter, setPersonFilter] = useState<number | null>(() => getPersonIdFromSearch());
  const [personFilterName, setPersonFilterName] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [s3Config, setS3Config] = useState<{ configured: boolean; missingVars: string[] } | null>(null);
  const [s3AlertDismissed, setS3AlertDismissed] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setPage(pathToPage(window.location.pathname));
      setPersonFilter(getPersonIdFromSearch());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    fetch("/api/backup/config")
      .then((r) => r.json())
      .then(setS3Config)
      .catch(() => setS3Config({ configured: false, missingVars: [] }));
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

  const showS3Alert =
    s3Config &&
    !s3Config.configured &&
    !s3AlertDismissed;

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin);

  if (loading) {
    return <div className="app app--loading">Loading…</div>;
  }

  if (needsLogin) {
    return <LoginPage onSent={refresh} />;
  }

  return (
    <div className="app">
      {showS3Alert && (
        <div className="app__alert" role="alert">
          <span>
            S3 sync not configured. Missing: {s3Config.missingVars.join(", ")}.{" "}
            <a href="/backup" onClick={(e) => { e.preventDefault(); navigateTo("backup"); }}>
              Learn more
            </a>
          </span>
          <button
            type="button"
            className="app__alert-dismiss"
            onClick={() => setS3AlertDismissed(true)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <header className="header">
        <div className="header__top">
          <div>
            <h1 className="header__title">Family Media Manager</h1>
            <p className="header__subtitle u-text-muted">
              Upload and manage your family photos, videos, and documents.
            </p>
          </div>
          <div className="header__top-actions">
            {page === "home" && (
              <div id="home-header-actions" className="header__actions" />
            )}
            <button
              type="button"
              className="btn btn--primary header__upload"
              onClick={() => setUploadModalOpen(true)}
            >
              Upload
            </button>
            {authEnabled && user && (
              <div className="header__user">
                <span className="header__user-email">{user.email}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => logout()}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="app__body">
        <nav className="nav">
          <div className="nav__items">
            {navItems.map((item) => (
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
          {page === "backup" && <BackupPage onSyncComplete={fetchItems} />}
          {page === "admin" && user?.isAdmin && <AdminPage />}
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

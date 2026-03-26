import { lazy, Suspense, useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { NavMenu, NavMenuItem } from "@/components/ui/nav-menu";
import { useActivity } from "@/components/activity/activity-provider";
import { GlobalActivityOverlay } from "@/components/activity/global-activity-overlay";
import { apiJson } from "@/api/client";
import { UploadModal } from "@/features/media/components/upload-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  NAV_ITEMS,
  pageToPath,
  pathToPage,
  getPersonIdFromSearch,
  type PageId,
} from "@/config/nav";

const HomePage = lazy(async () => {
  const m = await import("@/features/media/components/home-page");
  return { default: m.HomePage };
});
const PeoplePage = lazy(async () => {
  const m = await import("@/features/people/components/people-page");
  return { default: m.PeoplePage };
});
const AdminPage = lazy(async () => {
  const m = await import("@/features/admin/components/admin-page");
  return { default: m.AdminPage };
});

function buildPathWithSearch(path: string, search?: string): string {
  if (!search) return path;
  return `${path}?${search}`;
}

function getHomePersonFilter(search?: string): number | null {
  if (!search) return null;
  const personMatch = /person=(\d+)/.exec(search);
  if (!personMatch) return null;
  return parseInt(personMatch[1], 10);
}

function s3AlertMessage(missingVars: string[]): string {
  return `S3 sync not configured. Missing: ${missingVars.join(", ")}.`;
}

function navigateToPage(
  pageId: PageId,
  search: string | undefined,
  setPage: (page: PageId) => void,
  setPersonFilter: (value: number | null) => void
): void {
  setPage(pageId);
  const path = pageToPath(pageId);
  const fullPath = buildPathWithSearch(path, search);
  if (window.location.pathname + window.location.search !== fullPath) {
    window.history.pushState({}, "", fullPath);
  }
  if (pageId === "home") {
    setPersonFilter(getHomePersonFilter(search));
  }
}

export function AuthenticatedApp() {
  const { authEnabled, user, logout } = useAuth();
  const activity = useActivity();
  const s3Config = activity
    ? { configured: activity.sync.configured, missingVars: activity.sync.missingVars }
    : null;
  const [page, setPage] = useState<PageId>(() => pathToPage(window.location.pathname));
  const [personFilter, setPersonFilter] = useState<number | null>(() => getPersonIdFromSearch());
  const [personFilterName, setPersonFilterName] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [s3AlertDismissed, setS3AlertDismissed] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setPage(pathToPage(window.location.pathname));
      setPersonFilter(getPersonIdFromSearch());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = useCallback((pageId: PageId, search?: string) => {
    navigateToPage(pageId, search, setPage, setPersonFilter);
  }, []);

  useEffect(() => {
    if (personFilter == null) {
      setPersonFilterName(null);
      return;
    }
    void apiJson<Array<{ id: number; name: string }>>("people")
      .then((people) => {
        const p = people.find((x) => x.id === personFilter);
        setPersonFilterName(p?.name ?? `Person ${personFilter}`);
      })
      .catch(() => setPersonFilterName(`Person ${personFilter}`));
  }, [personFilter]);

  const fetchItems = useCallback(() => {
    window.dispatchEvent(new CustomEvent("home-refresh"));
  }, []);

  const handleOpenUploadModal = useCallback(() => setUploadModalOpen(true), []);
  const handleCloseUploadModal = useCallback(() => setUploadModalOpen(false), []);
  const handleDismissS3Alert = useCallback(() => setS3AlertDismissed(true), []);

  const showS3Alert = s3Config && !s3Config.configured && !s3AlertDismissed;

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin);
  const showUserInfo = authEnabled && user != null;

  let mainPage: ReactNode = null;
  if (page === "home") {
    mainPage = (
      <HomePage
        personFilter={personFilter}
        personFilterName={personFilterName}
        onClearPersonFilter={() => navigateTo("home")}
      />
    );
  }
  if (page === "people") {
    mainPage = (
      <PeoplePage
        onUpdate={fetchItems}
        onViewAllPhotos={(personId) => navigateTo("home", `person=${personId}`)}
      />
    );
  }
  if (page === "admin" && user?.isAdmin) {
    mainPage = <AdminPage onSyncComplete={fetchItems} />;
  }

  return (
    <div className="app">
      {showS3Alert && (
        <Banner onDismiss={handleDismissS3Alert}>
          {s3AlertMessage(s3Config.missingVars)}
          {user?.isAdmin ? (
            <>
              {" "}
              <a
                href="/admin"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  navigateTo("admin");
                }}
              >
                Open Admin
              </a>
            </>
          ) : (
            " Set these on the server to enable sync."
          )}
        </Banner>
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
            <Button
              variant="primary"
              className="header__upload"
              onClick={handleOpenUploadModal}
            >
              Upload
            </Button>
            {showUserInfo && (
              <div className="header__user">
                <span className="header__user-email">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="app__body">
        <nav className="nav">
          <NavMenu>
            {navItems.map((item) => (
              <NavMenuItem key={item.id} active={page === item.id} onClick={() => navigateTo(item.id)}>
                {item.label}
              </NavMenuItem>
            ))}
          </NavMenu>
        </nav>
        <main className="main">
          <Suspense fallback={<div className="u-pad">Loading…</div>}>{mainPage}</Suspense>
        </main>
      </div>
      {uploadModalOpen && (
        <UploadModal onClose={handleCloseUploadModal} onUploadComplete={fetchItems} />
      )}
      <GlobalActivityOverlay />
    </div>
  );
}

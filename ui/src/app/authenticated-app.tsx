import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { NavMenu, NavMenuItem } from "@/components/ui/nav-menu";
import { useActivity } from "@/components/activity/activity-provider";
import { GlobalActivityOverlay } from "@/components/activity/global-activity-overlay";
import { UploadModal } from "@/features/media/components/upload-modal";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { NAV_ITEMS, pageToPath, pathToPage, type PageId } from "@/config/nav";

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

function s3AlertMessage(missingVars: string[]): string {
  return `S3 sync not configured. Missing: ${missingVars.join(", ")}.`;
}

export function AuthenticatedApp() {
  const { authEnabled, user, logout } = useAuth();
  const canLogOut = authEnabled === true && user != null;
  const activity = useActivity();
  const s3Config = activity
    ? { configured: activity.sync.configured, missingVars: activity.sync.missingVars }
    : null;
  const [page, setPage] = useState<PageId>(() => pathToPage(window.location.pathname));
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [s3AlertDismissed, setS3AlertDismissed] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      setPage(pathToPage(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigateTo = useCallback((pageId: PageId, search?: string) => {
    setPage(pageId);
    const path = pageToPath(pageId);
    const fullPath = buildPathWithSearch(path, search);
    if (window.location.pathname + window.location.search !== fullPath) {
      window.history.pushState({}, "", fullPath);
    }
  }, []);

  const fetchItems = useCallback(() => {
    window.dispatchEvent(new CustomEvent("home-refresh"));
  }, []);

  const handleOpenUploadModal = useCallback(() => setUploadModalOpen(true), []);
  const handleCloseUploadModal = useCallback(() => setUploadModalOpen(false), []);
  const handleDismissS3Alert = useCallback(() => setS3AlertDismissed(true), []);

  const showS3Alert = s3Config && !s3Config.configured && !s3AlertDismissed;

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin);
  const showAccount = user != null;

  let mainPage: ReactNode = null;
  if (page === "home") {
    mainPage = <HomePage />;
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
          <h1 className="header__title">Family Media</h1>
          <div className="header__top-actions">
            <Button
              variant="primary"
              size="sm"
              className="header__upload"
              onClick={handleOpenUploadModal}
            >
              Upload
            </Button>
            {showAccount && (
              <div className="header__user">
                <span className="header__user-email">{user.email}</span>
                {canLogOut && (
                  <Button variant="ghost" size="sm" onClick={() => void logout()}>
                    Log out
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="app__body">
        <nav className="nav">
          <NavMenu>
            {navItems.map((item) => (
              <NavMenuItem
                key={item.id}
                active={page === item.id}
                onClick={() => navigateTo(item.id)}
              >
                {item.label}
              </NavMenuItem>
            ))}
          </NavMenu>
          {showAccount && (
            <div className="nav__account">
              <div className="nav__account-email">{user.email}</div>
              {canLogOut && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="nav__account-logout"
                  onClick={() => void logout()}
                >
                  Log out
                </Button>
              )}
            </div>
          )}
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

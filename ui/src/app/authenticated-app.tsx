import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { NavMenu, NavMenuItem } from "@/components/ui/nav-menu";
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

export function AuthenticatedApp() {
  const { user, logout } = useAuth();
  const canLogOut = user != null;
  const [page, setPage] = useState<PageId>(() =>
    pathToPage(window.location.pathname),
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
  const handleCloseUploadModal = useCallback(
    () => setUploadModalOpen(false),
    [],
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside as never);
    return () =>
      document.removeEventListener("click", handleClickOutside as never);
  }, [showUserMenu]);

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

  const userInitial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="app">
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
              <div className="header__user" ref={userMenuRef}>
                <button
                  type="button"
                  className="header__avatar"
                  onClick={() => setShowUserMenu((v) => !v)}
                  aria-label="User menu"
                >
                  {userInitial}
                </button>
                {showUserMenu && (
                  <div className="header__user-menu">
                    <div className="header__user-info">{user.email}</div>
                    {canLogOut && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="header__logout"
                        onClick={() => {
                          setShowUserMenu(false);
                          void logout();
                        }}
                      >
                        Log out
                      </Button>
                    )}
                  </div>
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
        </nav>
        <main className="main">
          <Suspense fallback={<div className="u-pad">Loading…</div>}>
            {mainPage}
          </Suspense>
        </main>
      </div>
      {uploadModalOpen && (
        <UploadModal
          onClose={handleCloseUploadModal}
          onUploadComplete={fetchItems}
        />
      )}
      <GlobalActivityOverlay />
    </div>
  );
}

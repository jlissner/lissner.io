export type PageId = "home" | "people" | "backup" | "admin";

export interface NavItem {
  id: PageId;
  label: string;
  adminOnly?: boolean;
}

/** Add new pages here; extend PageId union above when adding. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home" },
  { id: "people", label: "People" },
  { id: "backup", label: "Sync" },
  { id: "admin", label: "Admin", adminOnly: true },
];

const PAGE_TO_PATH: Record<PageId, string> = {
  home: "/",
  people: "/people",
  backup: "/backup",
  admin: "/admin",
};

const PATH_TO_PAGE: Record<string, PageId> = {
  "/": "home",
  "/home": "home",
  "/people": "people",
  "/backup": "backup",
  "/admin": "admin",
};

export function pageToPath(page: PageId): string {
  return PAGE_TO_PATH[page];
}

export function pathToPage(pathname: string): PageId {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const pathOnly = normalized.split("?")[0];
  return PATH_TO_PAGE[pathOnly] ?? "home";
}

export function getPersonIdFromSearch(): number | null {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("person");
  if (!p) return null;
  const id = parseInt(p, 10);
  return !isNaN(id) && id > 0 ? id : null;
}

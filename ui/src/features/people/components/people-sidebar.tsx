import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Person } from "./people-types";

const PAGE_SIZE = 20;

interface PeopleSidebarProps {
  people: Person[];
  selectedId: number | null;
  menuOpen: number | null;
  onSelect: (id: number | null) => void;
  onMenuToggle: (id: number | null) => void;
  onEdit: (p: Person) => void;
  onMerge: (p: Person) => void;
  onDelete: (p: Person) => void;
  onAddPerson: () => void;
  onMatchFaces?: () => void;
  matchFacesBusy?: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

function photoCountLabel(count: number | undefined): string {
  const safeCount = count ?? 0;
  const noun = safeCount === 1 ? "photo" : "photos";
  return `${safeCount} ${noun}`;
}

function sortAlphabetically(people: Person[]): Person[] {
  return [...people].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function PersonAvatar({ person }: { person: Person }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [person.representativeMediaId]);

  if (person.representativeMediaId && !imgError) {
    return (
      <div className="person-row__avatar person-row__avatar--photo">
        <img
          src={`/api/media/${person.representativeMediaId}/face/${person.id}`}
          alt=""
          className="person-row__avatar-img"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  const isPlaceholder = person.name.startsWith("Person ");
  return (
    <div
      className={`person-row__avatar ${!isPlaceholder ? "person-row__avatar--initial" : ""}`}
    >
      {isPlaceholder ? (
        <span>?</span>
      ) : (
        <span>{person.name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export function PeopleSidebar({
  people,
  selectedId,
  menuOpen,
  onSelect,
  onMenuToggle,
  onEdit,
  onMerge,
  onDelete,
  onAddPerson,
  onMatchFaces,
  matchFacesBusy = false,
  menuRef,
}: PeopleSidebarProps) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef, onMenuToggle]);

  const sorted = useMemo(() => sortAlphabetically(people), [people]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => p.name.toLowerCase().includes(q));
  }, [sorted, search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = filtered.length > visibleCount;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((n) => n + PAGE_SIZE);
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const placeholderCount = people.filter((p) =>
    p.name.startsWith("Person "),
  ).length;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__header-top">
          <div>
            <h2 className="sidebar__title">People</h2>
            <p className="sidebar__subtitle">
              {people.length} {people.length === 1 ? "person" : "people"}
              {placeholderCount > 0 && (
                <span className="sidebar__unmerged">
                  {" "}
                  ({placeholderCount} unmatched)
                </span>
              )}
            </p>
          </div>
          <div className="sidebar__header-actions">
            <Button variant="ghost" size="sm" onClick={onAddPerson}>
              + Add
            </Button>
            {onMatchFaces && (
              <Button
                variant="secondary"
                size="sm"
                disabled={matchFacesBusy}
                onClick={onMatchFaces}
              >
                {matchFacesBusy ? "Matching…" : "Match"}
              </Button>
            )}
          </div>
        </div>
        {people.length > PAGE_SIZE && (
          <input
            type="text"
            className="sidebar__search"
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <div className="sidebar__list">
        {visible.length === 0 ? (
          <p className="sidebar__empty">
            {search
              ? "No matches"
              : "No people yet. Add a person or index your photos to detect faces."}
          </p>
        ) : (
          visible.map((p) => (
            <div
              key={p.id}
              className="person-row__wrap"
              ref={
                menuOpen === p.id
                  ? (menuRef as React.RefObject<HTMLDivElement>)
                  : undefined
              }
            >
              <div
                role="button"
                tabIndex={0}
                className={`person-row ${selectedId === p.id ? "person-row--selected" : ""}`}
                onClick={() => {
                  onSelect(selectedId === p.id ? null : p.id);
                  onMenuToggle(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(selectedId === p.id ? null : p.id);
                    onMenuToggle(null);
                  }
                }}
              >
                <PersonAvatar person={p} />
                <div className="person-row__info">
                  <div className="person-row__name">{p.name}</div>
                  <div className="person-row__count">
                    {photoCountLabel(p.photoCount)}
                  </div>
                </div>
                <button
                  type="button"
                  className="person-row__menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle(menuOpen === p.id ? null : p.id);
                  }}
                  title="Actions"
                  aria-label="Actions"
                >
                  ⋮
                </button>
              </div>
              {menuOpen === p.id && (
                <DropdownMenu>
                  <DropdownMenuItem
                    onClick={() => {
                      onEdit(p);
                      onMenuToggle(null);
                    }}
                  >
                    Edit name
                  </DropdownMenuItem>
                  {people.length > 1 && (
                    <DropdownMenuItem
                      onClick={() => {
                        onMerge(p);
                        onMenuToggle(null);
                      }}
                    >
                      Merge into another person
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    variant="danger"
                    onClick={() => {
                      onDelete(p);
                      onMenuToggle(null);
                    }}
                  >
                    Delete person
                  </DropdownMenuItem>
                </DropdownMenu>
              )}
            </div>
          ))
        )}
        {hasMore && (
          <div className="sidebar__load-more">
            <Button variant="ghost" size="sm" onClick={handleLoadMore}>
              Show more ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

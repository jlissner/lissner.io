import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { Person } from "./people-types";

export type { Person };

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

function nextSelectedId(currentSelectedId: number | null, personId: number): number | null {
  if (currentSelectedId === personId) return null;
  return personId;
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
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef, onMenuToggle]);

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">People</h2>
        <p className="sidebar__subtitle">
          {people.length} {people.length === 1 ? "person" : "people"}
        </p>
        <div className="sidebar__header-actions">
          {onMatchFaces && (
            <Button
              variant="secondary"
              className="sidebar__match-faces"
              disabled={matchFacesBusy}
              onClick={onMatchFaces}
            >
              {matchFacesBusy ? "Matching…" : "Match faces"}
            </Button>
          )}
          <Button variant="ghost" className="sidebar__add" onClick={onAddPerson}>
            + Add person
          </Button>
        </div>
      </div>
      <div className="sidebar__list">
        {people.length === 0 ? (
          <p className="empty">No people yet. Add a person or index your photos to detect faces.</p>
        ) : (
          people.map((p) => (
            <div
              key={p.id}
              className="u-flex"
              style={{ position: "relative" }}
              ref={menuOpen === p.id ? (menuRef as React.RefObject<HTMLDivElement>) : undefined}
            >
              <div
                role="button"
                tabIndex={0}
                className={`person-row ${selectedId === p.id ? "person-row--selected" : ""}`}
                onClick={() => {
                  onSelect(nextSelectedId(selectedId, p.id));
                  onMenuToggle(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(nextSelectedId(selectedId, p.id));
                    onMenuToggle(null);
                  }
                }}
              >
                <div
                  className={`person-row__avatar ${!p.name.startsWith("Person ") ? "person-row__avatar--initial" : ""}`}
                >
                  {p.name.startsWith("Person ") ? (
                    <span>👤</span>
                  ) : (
                    <span>{p.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
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
      </div>
    </aside>
  );
}

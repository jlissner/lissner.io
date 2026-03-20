import { useEffect } from "react";
import type { Person } from "./peopleTypes";

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
  menuRef: React.RefObject<HTMLDivElement | null>;
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
        <button type="button" className="btn btn--ghost sidebar__add" onClick={onAddPerson}>
          + Add person
        </button>
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
                    {p.photoCount ?? 0} {(p.photoCount ?? 0) === 1 ? "photo" : "photos"}
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
                <div className="dropdown">
                  <button
                    type="button"
                    className="dropdown__item"
                    onClick={() => {
                      onEdit(p);
                      onMenuToggle(null);
                    }}
                  >
                    Edit name
                  </button>
                  {people.length > 1 && (
                    <button
                      type="button"
                      className="dropdown__item"
                      onClick={() => {
                        onMerge(p);
                        onMenuToggle(null);
                      }}
                    >
                      Merge into another person
                    </button>
                  )}
                  <button
                    type="button"
                    className="dropdown__item dropdown__item--danger"
                    onClick={() => {
                      onDelete(p);
                      onMenuToggle(null);
                    }}
                  >
                    Delete person
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

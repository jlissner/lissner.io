import { useEffect } from "react";
import { peopleLayoutStyles as s } from "./peopleStylesLayout";
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
    <aside style={s.sidebar}>
      <div style={s.sidebarHeader}>
        <h2 style={s.sidebarTitle}>People</h2>
        <p style={s.sidebarSubtitle}>
          {people.length} {people.length === 1 ? "person" : "people"} detected
        </p>
      </div>
      <div style={s.peopleList}>
        {people.length === 0 ? (
          <p style={{ padding: 20, color: "#64748b", fontSize: "0.875rem" }}>
            No people yet. Index your photos to detect faces.
          </p>
        ) : (
          people.map((p) => (
            <div key={p.id} style={{ position: "relative" }} ref={menuOpen === p.id ? (menuRef as React.RefObject<HTMLDivElement>) : undefined}>
              <button
                type="button"
                style={{ ...s.personRow(selectedId === p.id) }}
                onClick={() => {
                  onSelect(selectedId === p.id ? null : p.id);
                  onMenuToggle(null);
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== p.id) e.currentTarget.style.backgroundColor = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== p.id) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={s.avatar}>
                  {p.name.startsWith("Person ") ? (
                    <span>👤</span>
                  ) : (
                    <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={s.personInfo}>
                  <div style={s.personName}>{p.name}</div>
                  <div style={s.personCount}>
                    {(p.photoCount ?? 0)} {(p.photoCount ?? 0) === 1 ? "photo" : "photos"}
                  </div>
                </div>
                <button
                  type="button"
                  style={s.menuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle(menuOpen === p.id ? null : p.id);
                  }}
                  title="Actions"
                  aria-label="Actions"
                >
                  ⋮
                </button>
              </button>
              {menuOpen === p.id && (
                <div style={s.dropdown}>
                  <button type="button" style={s.dropdownItem} onClick={() => { onEdit(p); onMenuToggle(null); }}>
                    Edit name
                  </button>
                  {people.length > 1 && (
                    <button type="button" style={s.dropdownItem} onClick={() => { onMerge(p); onMenuToggle(null); }}>
                      Merge into another person
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

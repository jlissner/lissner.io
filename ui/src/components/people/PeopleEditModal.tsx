import { peopleStyles as s } from "./peopleStyles";

interface Person {
  id: number;
  name: string;
}

interface PeopleEditModalProps {
  person: Person;
  draft: string;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function PeopleEditModal({ person, draft, onDraftChange, onSave, onClose }: PeopleEditModalProps) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.modalTitle}>Edit name</h3>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#64748b" }}>{person.name}</p>
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Enter name"
          autoFocus
          style={s.input}
        />
        <div style={s.modalActions}>
          <button type="button" style={s.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={s.primaryButton} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

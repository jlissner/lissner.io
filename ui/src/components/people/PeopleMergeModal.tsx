import { peopleStyles as s } from "./peopleStyles";

interface Person {
  id: number;
  name: string;
}

interface PeopleMergeModalProps {
  person: Person;
  people: Person[];
  targetId: string;
  onTargetChange: (v: string) => void;
  onMerge: () => void;
  onClose: () => void;
}

export function PeopleMergeModal({
  person,
  people,
  targetId,
  onTargetChange,
  onMerge,
  onClose,
}: PeopleMergeModalProps) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={s.modalTitle}>Merge &quot;{person.name}&quot; into</h3>
        <p style={{ margin: "0 0 8px", fontSize: "0.875rem", color: "#64748b" }}>
          All photos of {person.name} will be reassigned to the selected person.
        </p>
        <select value={targetId} onChange={(e) => onTargetChange(e.target.value)} style={s.select}>
          <option value="">Select person</option>
          {people
            .filter((p) => p.id !== person.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div style={s.modalActions}>
          <button type="button" style={s.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={s.primaryButton} onClick={onMerge} disabled={!targetId}>
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

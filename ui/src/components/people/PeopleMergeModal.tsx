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
    <div className="modal" onClick={onClose} role="presentation">
      <div className="modal__content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="merge-person-title">
        <h3 id="merge-person-title" className="modal__title">Merge &quot;{person.name}&quot; into</h3>
        <p className="modal__body u-text-muted u-text-sm u-mb-2">
          All photos of {person.name} will be reassigned to the selected person.
        </p>
        <select value={targetId} onChange={(e) => onTargetChange(e.target.value)} className="form__select u-mt-2">
          <option value="">Select person</option>
          {people
            .filter((p) => p.id !== person.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={onMerge} disabled={!targetId}>
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

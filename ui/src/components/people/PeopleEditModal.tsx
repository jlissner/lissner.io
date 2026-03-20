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

export function PeopleEditModal({
  person,
  draft,
  onDraftChange,
  onSave,
  onClose,
}: PeopleEditModalProps) {
  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-person-title"
      >
        <h3 id="edit-person-title" className="modal__title">
          Edit name
        </h3>
        <p className="modal__body u-text-muted u-text-sm u-mb-3">{person.name}</p>
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
          className="form__input u-mb-4"
        />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

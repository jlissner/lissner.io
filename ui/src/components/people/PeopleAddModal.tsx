import { useState } from "react";

interface PeopleAddModalProps {
  onAdd: (name: string) => void;
  onClose: () => void;
}

export function PeopleAddModal({ onAdd, onClose }: PeopleAddModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  };

  return (
    <div className="modal" onClick={onClose} role="presentation">
      <div
        className="modal__content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-person-title"
      >
        <h3 id="add-person-title" className="modal__title">
          Add person
        </h3>
        <p className="modal__body u-text-muted u-text-sm u-mb-3">
          Create a person without a photo. You can tag them in photos later.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Name"
          autoFocus
          className="form__input u-mb-4"
        />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { ModalActions, ModalBody, ModalPanel, ModalRoot, ModalTitle } from "@/components/ui/modal";

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
    <ModalRoot onBackdropClick={onClose}>
      <ModalPanel aria-labelledby="edit-person-title" onEscape={onClose}>
        <ModalTitle as="h3" id="edit-person-title">
          Edit name
        </ModalTitle>
        <ModalBody className="u-text-muted u-text-sm u-mb-3">{person.name}</ModalBody>
        <label htmlFor="edit-person-name" className="u-sr-only">
          New name
        </label>
        <input
          id="edit-person-name"
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave();
          }}
          placeholder="Enter name"
          autoFocus
          className="form__input u-mb-4"
        />
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

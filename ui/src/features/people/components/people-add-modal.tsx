import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalBody,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";

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
    <ModalRoot onBackdropClick={onClose}>
      <ModalPanel aria-labelledby="add-person-title" onEscape={onClose}>
        <ModalTitle as="h3" id="add-person-title">
          Add person
        </ModalTitle>
        <ModalBody className="u-mb-3">
          <Text variant="muted" size="sm" as="div">
            Create a person without a photo. You can tag them in photos later.
          </Text>
        </ModalBody>
        <label htmlFor="add-person-name" className="u-sr-only">
          Person name
        </label>
        <input
          id="add-person-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Name"
          autoFocus
          className="form__input u-mb-4"
        />
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Add
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

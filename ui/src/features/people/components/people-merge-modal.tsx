import { Button } from "@/components/ui/button";
import { ModalActions, ModalBody, ModalPanel, ModalRoot, ModalTitle } from "@/components/ui/modal";
import { Stack } from "@/components/ui/stack";
import { PersonSelect } from "./PersonSelect";

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
    <ModalRoot onBackdropClick={onClose}>
      <ModalPanel aria-labelledby="merge-person-title" onEscape={onClose}>
        <Stack gap={3}>
          <ModalTitle as="h3" id="merge-person-title">
            Merge &quot;{person.name}&quot; into
          </ModalTitle>
          <ModalBody className="u-text-muted u-text-sm u-mb-0">
            All photos of {person.name} will be reassigned to the selected person.
          </ModalBody>
          <PersonSelect
            people={people}
            excludeIds={[person.id]}
            placeholder="Select person"
            value={targetId}
            onChange={(e) => onTargetChange(e.target.value)}
            className="form__select"
            aria-label="Person to merge into"
          />
        </Stack>
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onMerge} disabled={!targetId}>
            Merge
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

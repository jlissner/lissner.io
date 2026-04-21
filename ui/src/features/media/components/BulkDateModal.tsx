import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalActions, ModalBody, ModalPanel, ModalRoot, ModalTitle } from "@/components/ui/modal";
import { bulkPatchDateTaken } from "../api";

interface BulkDateModalProps {
  mediaIds: string[];
  onClose: () => void;
  onDone: () => void;
}

export function BulkDateModal({ mediaIds, onClose, onDone }: BulkDateModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setError(null);
    const datePart = date.trim();
    const timePart = time.trim();

    if (!datePart) {
      setError("Enter a date.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      setError("Enter a valid date (YYYY-MM-DD).");
      return;
    }

    const [y, mo, d] = datePart.split("-").map(Number);
    const hh = timePart ? Number(timePart.split(":")[0]) : 12;
    const mm = timePart ? Number(timePart.split(":")[1]) : 0;

    if ([y, mo, d, hh, mm].some((n) => Number.isNaN(n))) {
      setError("Enter valid date and time values.");
      return;
    }

    const at = new Date(y, mo - 1, d, hh, mm, 0, 0);
    if (at.getFullYear() !== y || at.getMonth() !== mo - 1 || at.getDate() !== d) {
      setError("That calendar date is not valid.");
      return;
    }

    setSaving(true);
    try {
      const result = await bulkPatchDateTaken(mediaIds, at.toISOString());
      if (result.failed > 0) {
        setError(`Updated ${result.succeeded}, failed ${result.failed}.`);
      }
      onDone();
    } catch {
      setError("Failed to update dates.");
    } finally {
      setSaving(false);
    }
  }, [date, time, mediaIds, onDone]);

  const handleClear = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const result = await bulkPatchDateTaken(mediaIds, null);
      if (result.failed > 0) {
        setError(`Cleared ${result.succeeded}, failed ${result.failed}.`);
      }
      onDone();
    } catch {
      setError("Failed to clear dates.");
    } finally {
      setSaving(false);
    }
  }, [mediaIds, onDone]);

  return (
    <ModalRoot onBackdropClick={saving ? () => {} : onClose}>
      <ModalPanel onEscape={saving ? undefined : onClose} aria-labelledby="bulk-date-title">
        <ModalTitle id="bulk-date-title">
          Set date taken ({mediaIds.length} {mediaIds.length === 1 ? "file" : "files"})
        </ModalTitle>
        <ModalBody>
          <div className="bulk-date__fields">
            <label className="bulk-date__label">
              Date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form__input"
                disabled={saving}
              />
            </label>
            <label className="bulk-date__label">
              Time (optional)
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="form__input"
                disabled={saving}
              />
            </label>
          </div>
          {error && <p className="bulk-date__error">{error}</p>}
        </ModalBody>
        <ModalActions>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
            Clear dates
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Apply"}
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}

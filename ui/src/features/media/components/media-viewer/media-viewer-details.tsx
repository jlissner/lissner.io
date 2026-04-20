import { useCallback, useEffect, useState } from "react";
import { formatLocalDateTimeMediumShort } from "@/lib/local-datetime.js";
import { getMediaDetails, patchMediaDateTaken } from "../../api";
import type { MediaItem } from "./media-utils";
import type {
  MediaDetailsApiResponse,
  MediaPatchResponse,
} from "../../../../../../shared/src/api.js";
type MediaDetails = MediaDetailsApiResponse;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLocation(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

function isoToDateAndTimeInputs(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

type DateTakenParseResult =
  | { kind: "clear" }
  | { kind: "ok"; at: Date }
  | { kind: "error"; message: string };

/** Empty date clears. Missing time defaults to 12:00 in the local timezone. */
function parseDateTakenForm(datePart: string, timePart: string): DateTakenParseResult {
  const dTrim = datePart.trim();
  const tTrim = timePart.trim();
  if (dTrim === "") {
    if (tTrim !== "") {
      return {
        kind: "error",
        message: "Select a date, or clear the time field before saving.",
      };
    }
    return { kind: "clear" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dTrim)) {
    return { kind: "error", message: "Enter a valid date (year, month, and day)." };
  }
  const parts = dTrim.split("-").map((s) => Number(s));
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (parts.some((n) => Number.isNaN(n))) {
    return { kind: "error", message: "Enter a valid date (year, month, and day)." };
  }
  const clock =
    tTrim === ""
      ? ({ hh: 12, mm: 0, ss: 0 } as const)
      : (() => {
          const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(tTrim);
          if (!m) return null;
          const hh = Number(m[1]);
          const mm = Number(m[2]);
          const ss = m[3] != null ? Number(m[3]) : 0;
          if ([hh, mm, ss].some((n) => Number.isNaN(n)) || hh > 23 || mm > 59 || ss > 59) {
            return null;
          }
          return { hh, mm, ss } as const;
        })();
  if (clock === null) {
    return {
      kind: "error",
      message:
        "Enter a valid time (hours and minutes), or leave time blank to use 12:00 noon on that day.",
    };
  }
  const at = new Date(y, mo - 1, day, clock.hh, clock.mm, clock.ss, 0);
  if (at.getFullYear() !== y || at.getMonth() !== mo - 1 || at.getDate() !== day) {
    return {
      kind: "error",
      message: "That calendar date is not valid (for example, there is no February 30).",
    };
  }
  return { kind: "ok", at };
}

function errorMessageFromPatchResponse(raw: string, status: number): string {
  if (!raw.trim()) {
    return `Could not save the date (${status}). The server did not return a message.`;
  }
  const parsed = (() => {
    try {
      return JSON.parse(raw) as { error?: unknown };
    } catch {
      return null;
    }
  })();
  if (parsed && typeof parsed.error === "string" && parsed.error.trim() !== "") {
    return parsed.error;
  }
  return `Could not save the date (${status}). ${raw.trim().slice(0, 240)}`;
}

interface MediaViewerDetailsProps {
  item: MediaItem;
  refreshTrigger?: number;
  onMetadataUpdated?: () => void;
}

export function MediaViewerDetails({
  item,
  refreshTrigger = 0,
  onMetadataUpdated,
}: MediaViewerDetailsProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDateTaken, setEditingDateTaken] = useState(false);
  const [dateTakenDate, setDateTakenDate] = useState("");
  const [dateTakenTime, setDateTakenTime] = useState("");
  const [dateTakenSaving, setDateTakenSaving] = useState(false);
  const [dateTakenEditError, setDateTakenEditError] = useState<string | null>(null);

  const loadDetails = useCallback(() => {
    setLoading(true);
    setError(null);
    getMediaDetails(item.id)
      .then(setDetails)
      .catch(() => setError("Could not load details"))
      .finally(() => setLoading(false));
  }, [item.id]);

  useEffect(() => {
    loadDetails();
  }, [item.id, refreshTrigger, loadDetails]);

  const beginEditDateTaken = useCallback(() => {
    const { date, time } = isoToDateAndTimeInputs(details?.dateTaken);
    setDateTakenDate(date);
    setDateTakenTime(time);
    setDateTakenEditError(null);
    setEditingDateTaken(true);
  }, [details?.dateTaken]);

  const cancelEditDateTaken = useCallback(() => {
    setEditingDateTaken(false);
    setDateTakenEditError(null);
  }, []);

  const saveDateTaken = useCallback(
    async (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();

      const parsed = parseDateTakenForm(dateTakenDate, dateTakenTime);
      if (parsed.kind === "error") {
        setDateTakenEditError(parsed.message);
        return;
      }
      const body =
        parsed.kind === "clear"
          ? ({ dateTaken: null } satisfies { dateTaken: string | null })
          : ({ dateTaken: parsed.at.toISOString() } as const);
      setDateTakenSaving(true);
      setDateTakenEditError(null);
      const res = await patchMediaDateTaken(item.id, body);
      const rawBody = await res.text();
      setDateTakenSaving(false);
      if (!res.ok) {
        setDateTakenEditError(errorMessageFromPatchResponse(rawBody, res.status));
        return;
      }
      const data = (() => {
        try {
          return JSON.parse(rawBody) as unknown;
        } catch {
          return null;
        }
      })();
      if (
        data === null ||
        typeof data !== "object" ||
        !("dateTaken" in data) ||
        (typeof (data as MediaPatchResponse).dateTaken !== "string" &&
          (data as MediaPatchResponse).dateTaken !== null)
      ) {
        setDateTakenEditError(
          "The date may have saved, but the server response was not valid. Refresh the page to confirm."
        );
        return;
      }
      const patch = data as MediaPatchResponse;
      setDetails((prev) => (prev ? { ...prev, dateTaken: patch.dateTaken } : prev));
      setEditingDateTaken(false);
      onMetadataUpdated?.();
    },
    [dateTakenDate, dateTakenTime, item.id, onMetadataUpdated]
  );

  if (loading) {
    return (
      <div className="viewer-details">
        <h3 className="viewer-details__title">Details</h3>
        <p className="viewer-details__muted">Loading…</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="viewer-details">
        <h3 className="viewer-details__title">Details</h3>
        <p className="viewer-details__muted">{error ?? "No details available"}</p>
      </div>
    );
  }

  const hasLocation = details.latitude != null && details.longitude != null;

  return (
    <div className="viewer-details">
      <h3 className="viewer-details__title">Details</h3>
      <dl className="viewer-details__list">
        {details.people && details.people.length > 0 && (
          <>
            <dt className="viewer-details__term">People</dt>
            <dd className="viewer-details__value">{details.people.join(", ")}</dd>
          </>
        )}
        <dt className="viewer-details__term">Uploaded</dt>
        <dd className="viewer-details__value">
          {formatLocalDateTimeMediumShort(details.uploadedAt)}
        </dd>
        <dt className="viewer-details__term">Date taken</dt>
        <dd className="viewer-details__value">
          {editingDateTaken ? (
            <form onSubmit={saveDateTaken}>
              <div className="viewer-details__date-fields">
                <input
                  type="date"
                  className="viewer-details__datetime-input"
                  value={dateTakenDate}
                  onChange={(e) => setDateTakenDate(e.target.value)}
                  disabled={dateTakenSaving}
                  aria-label="Date taken"
                />
                <input
                  type="time"
                  className="viewer-details__datetime-input"
                  value={dateTakenTime}
                  onChange={(e) => setDateTakenTime(e.target.value)}
                  disabled={dateTakenSaving}
                  aria-label="Time taken (optional)"
                />
              </div>
              <p className="viewer-details__muted viewer-details__hint">
                Time is optional; if you leave it blank, 12:00 noon on that day is used. Clear the
                date and save to remove date taken.
              </p>
              {dateTakenEditError && (
                <p className="viewer-details__muted u-text-danger">{dateTakenEditError}</p>
              )}
              <div className="viewer-details__actions">
                <button className="btn btn--primary btn--sm" disabled={dateTakenSaving}>
                  {dateTakenSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={cancelEditDateTaken}
                  disabled={dateTakenSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {details.dateTaken ? (
                formatLocalDateTimeMediumShort(details.dateTaken)
              ) : (
                <span className="viewer-details__muted">Not set</span>
              )}{" "}
              <button type="button" className="btn btn--ghost btn--sm" onClick={beginEditDateTaken}>
                {details.dateTaken ? "Edit" : "Set"}
              </button>
            </>
          )}
        </dd>
        <dt className="viewer-details__term">File size</dt>
        <dd className="viewer-details__value">{formatFileSize(details.size)}</dd>
        <dt className="viewer-details__term">Type</dt>
        <dd className="viewer-details__value">{details.mimeType}</dd>
        <dt className="viewer-details__term">Download</dt>
        <dd className="viewer-details__value">
          <a
            href={`/api/media/${details.id}`}
            download={details.originalName}
            className="viewer-details__link"
          >
            {details.originalName}
          </a>
          {details.motionCompanion && (
            <>
              <br />
              <a
                href={`/api/media/${details.motionCompanion.id}`}
                download={details.motionCompanion.originalName}
                className="viewer-details__link"
              >
                {details.motionCompanion.originalName}
              </a>
            </>
          )}
        </dd>
        {details.indexed && (
          <>
            <dt className="viewer-details__term">AI search</dt>
            <dd className="viewer-details__value">
              <span className="viewer-details__badge">Indexed</span>
            </dd>
          </>
        )}
        <dt className="viewer-details__term">Backup</dt>
        <dd className="viewer-details__value">
          {details.backedUp ? (
            <>
              <span className="viewer-details__badge viewer-details__badge--success">
                Backed up
              </span>
              {details.backedUpAt && (
                <span className="viewer-details__sub">
                  {" "}
                  {formatLocalDateTimeMediumShort(details.backedUpAt)}
                </span>
              )}
            </>
          ) : (
            <span className="viewer-details__muted">Not backed up yet</span>
          )}
        </dd>
        {hasLocation && (
          <>
            <dt className="viewer-details__term">Location</dt>
            <dd className="viewer-details__value">
              <a
                href={`https://www.openstreetmap.org/?mlat=${details.latitude}&mlon=${details.longitude}&zoom=15`}
                target="_blank"
                rel="noopener noreferrer"
                className="viewer-details__link"
              >
                {formatLocation(details.latitude!, details.longitude!)}
              </a>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

import { useEffect, useState } from "react";
import type { MediaItem } from "./media-utils";

interface MediaDetails {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  people?: string[];
  indexed?: boolean;
  backedUp?: boolean;
  backedUpAt?: string | null;
  motionCompanion?: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  } | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

interface MediaViewerDetailsProps {
  item: MediaItem;
  refreshTrigger?: number;
}

export function MediaViewerDetails({ item, refreshTrigger = 0 }: MediaViewerDetailsProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/media/${item.id}/details`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then(setDetails)
      .catch(() => setError("Could not load details"))
      .finally(() => setLoading(false));
  }, [item.id, refreshTrigger]);

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
        <dd className="viewer-details__value">{formatDate(details.uploadedAt)}</dd>
        {details.dateTaken && (
          <>
            <dt className="viewer-details__term">Date taken</dt>
            <dd className="viewer-details__value">{formatDate(details.dateTaken)}</dd>
          </>
        )}
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
                <span className="viewer-details__sub"> {formatDate(details.backedUpAt)}</span>
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

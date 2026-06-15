import { useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteMediaById, runBulkIndex } from "@/features/media/api";
import { MEDIA_URL_QUERY_KEY } from "@/features/media/lib/media-viewer-url";
import { clearMediaFileIssue, listMediaFileIssues } from "../../api";
import { fileIssueCodeLabel, formatBytes } from "../../lib/format";

const FILE_ISSUES_KEY = ["admin", "fileIssues"];

export function FileIssuesTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const fileIssuesQuery = useQuery({
    queryKey: FILE_ISSUES_KEY,
    queryFn: () => listMediaFileIssues().then((r) => r.items),
  });
  const fileIssues = fileIssuesQuery.data ?? null;
  const fileIssuesLoading = fileIssuesQuery.isFetching;
  const fileIssuesError = fileIssuesQuery.isError
    ? errorMessage(fileIssuesQuery.error, "Failed to load file issues")
    : null;

  const invalidateFileIssues = () =>
    queryClient.invalidateQueries({ queryKey: FILE_ISSUES_KEY });

  const handleClearFileIssue = async (mediaId: string) => {
    try {
      await clearMediaFileIssue(mediaId);
      await invalidateFileIssues();
    } catch (err) {
      showToast(errorMessage(err, "Clear failed"));
    }
  };

  const handleReindexFileIssue = async (mediaId: string) => {
    try {
      await runBulkIndex([mediaId]);
      showToast(
        "Re-index started for this item. Check activity, then refresh this list.",
        "info",
      );
    } catch (err) {
      showToast(errorMessage(err, "Re-index request failed"));
    }
  };

  const handleDeleteFileIssue = async (
    mediaId: string,
    originalName: string,
  ) => {
    if (
      !confirm(
        `Permanently delete “${originalName}” from the library? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteMediaById(mediaId);
      await invalidateFileIssues();
    } catch (err) {
      showToast(errorMessage(err, "Delete failed"));
    }
  };

  return (
    <div
      id="admin-panel-file-issues"
      role="tabpanel"
      aria-labelledby="admin-tab-file-issues"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Corrupt or unreadable files</h3>
        <p className="admin-page__desc">
          Items here failed automated checks: missing files on disk (sync/upload
          lag or removed objects), unreadable video containers, or bad ffprobe
          output. Open in the gallery to inspect, re-index after the file
          exists, clear the flag when resolved, or delete the library entry.
        </p>
        <div className="admin-page__form">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={fileIssuesLoading}
            onClick={() => void invalidateFileIssues()}
          >
            {fileIssuesLoading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        {fileIssuesError && (
          <Alert variant="danger" role="alert">
            <p>{fileIssuesError}</p>
          </Alert>
        )}
        {!fileIssuesLoading &&
          fileIssues !== null &&
          fileIssues.length === 0 &&
          !fileIssuesError && (
            <p className="admin-page__meta">No flagged files.</p>
          )}
        {fileIssues !== null && fileIssues.length > 0 && (
          <ul className="admin-page__list">
            {fileIssues.map((row) => (
              <li
                key={row.id}
                className="admin-page__list-item admin-page__list-item--stacked"
              >
                <div>
                  <strong>{row.originalName}</strong>
                  <span className="admin-page__meta">
                    {" "}
                    · {row.mimeType} · {formatBytes(row.size)} ·{" "}
                    {fileIssueCodeLabel(row.issueCode)}
                  </span>
                </div>
                {row.issueAt != null && row.issueAt !== "" && (
                  <p className="admin-page__meta u-mb-1">
                    Flagged:{" "}
                    {new Date(row.issueAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                {row.issueDetail != null && row.issueDetail !== "" && (
                  <pre className="admin-page__meta admin-page__issue-detail">
                    {row.issueDetail}
                  </pre>
                )}
                <div className="admin-page__form">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.open(
                        `/?${MEDIA_URL_QUERY_KEY}=${encodeURIComponent(row.id)}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Open in gallery
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleReindexFileIssue(row.id)}
                  >
                    Re-index
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleClearFileIssue(row.id)}
                  >
                    Clear flag
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      void handleDeleteFileIssue(row.id, row.originalName)
                    }
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

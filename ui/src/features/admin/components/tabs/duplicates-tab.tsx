import { DuplicateReviewer } from "../duplicate-reviewer";

export function DuplicatesTab() {
  return (
    <div
      id="admin-panel-duplicates"
      role="tabpanel"
      aria-labelledby="admin-tab-duplicates"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Duplicate Detection</h3>
        <p className="admin-page__desc">
          Find and review duplicate images by content. Perceptual hashes are
          computed automatically on upload; backfill existing images from the
          Maintenance tab.
        </p>
        <DuplicateReviewer />
      </section>
    </div>
  );
}

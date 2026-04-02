/** If a sync is running when an auto-backup was requested, run again when it finishes. */
export const syncDefer = {
  pendingAfterCurrent: false,
  debounceTimer: null as ReturnType<typeof setTimeout> | null,
};

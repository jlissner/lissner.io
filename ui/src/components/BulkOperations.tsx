'use client'

interface ProgressState {
  isActive: boolean;
  completed: number;
  total: number;
  currentPhoto?: string;
}

interface BulkOperationsProps {
  selectionMode: boolean
  selectedPhotos: Set<string>
  deleteProgress: ProgressState
  downloadProgress: ProgressState
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDownload: () => void
  onBulkDelete: () => void
}

export const BulkOperations = ({
  selectionMode,
  selectedPhotos,
  deleteProgress,
  downloadProgress,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete
}: BulkOperationsProps) => {
  if (!selectionMode) return null

  return (
    <div data-flex="between" style={{ padding: '1rem', background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
      <div className="flex items-center space-x-4">
        {!deleteProgress.isActive && !downloadProgress.isActive && (
          <>
            <button
              onClick={onSelectAll}
              data-variant="secondary" 
              style={{ fontSize: '0.875rem', color: 'var(--primary-600)' }}
            >
              Select All
            </button>
            <button
              onClick={onClearSelection}
              data-variant="secondary" 
              style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}
            >
              Clear Selection
            </button>
          </>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {deleteProgress.isActive ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div data-loading="sm" style={{ borderTopColor: 'var(--red-600)' }}></div>
              <span className="text-sm text-gray-600">
                Deleting {deleteProgress.completed} of {deleteProgress.total} photos...
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="progress-bar w-48 h-2">
                <div
                  className="progress-fill bg-red-600"
                  style={{ width: `${Math.round((deleteProgress.completed / deleteProgress.total) * 100)}%` }}
                ></div>
              </div>
            </div>
            {deleteProgress.currentPhoto && (
              <span className="text-xs text-gray-500 max-w-32 truncate">
                {deleteProgress.currentPhoto}
              </span>
            )}
          </div>
        ) : downloadProgress.isActive ? (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div data-loading="sm" style={{ borderTopColor: 'var(--primary-600)' }}></div>
              <span className="text-sm text-gray-600">
                Downloading {downloadProgress.completed} of {downloadProgress.total} photos...
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="progress-bar w-48 h-2">
                <div
                  className="progress-fill bg-blue-600"
                  style={{ width: `${Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%` }}
                ></div>
              </div>
            </div>
            {downloadProgress.currentPhoto && (
              <span className="text-xs text-gray-500 max-w-32 truncate">
                {downloadProgress.currentPhoto}
              </span>
            )}
          </div>
        ) : (
          <>
            <span className="text-sm text-gray-600">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
            </span>
            {selectedPhotos.size > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onBulkDownload}
                  className="btn btn-primary"
                >
                  📥 Download Selected ({selectedPhotos.size})
                </button>
                <button
                  onClick={onBulkDelete}
                  className="btn btn-primary bg-red-600 hover:bg-red-700"
                >
                  🗑️ Delete Selected ({selectedPhotos.size})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 
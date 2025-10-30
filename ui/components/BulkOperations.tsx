'use client'

interface ProgressState {
  isActive: boolean;
  completed: number;
  total: number;
  currentPhoto?: string;
}

interface BulkOperationsProps {
  selectedPhotos: Set<string>
  deleteProgress: ProgressState
  downloadProgress: ProgressState
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDownload: () => void
  onBulkDelete: () => void
}

export const BulkOperations = ({
  selectedPhotos,
  deleteProgress,
  downloadProgress,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete
}: BulkOperationsProps) => {
  // Show bulk operations bar when photos are selected or operations are in progress
  if (selectedPhotos.size === 0 && !deleteProgress.isActive && !downloadProgress.isActive) {
    return null
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        {!deleteProgress.isActive && !downloadProgress.isActive && (
          <>
            <button
              onClick={onSelectAll}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onClearSelection}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              <span className="text-sm text-gray-600">
                Deleting {deleteProgress.completed} of {deleteProgress.total} photos...
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">
                Downloading {downloadProgress.completed} of {downloadProgress.total} photos...
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  📥 Download Selected ({selectedPhotos.size})
                </button>
                <button
                  onClick={onBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
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
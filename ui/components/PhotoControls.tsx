'use client'

interface PhotoControlsProps {
  selectionMode: boolean
  isOperationInProgress: boolean
  onSelectionModeToggle: () => void
}

export const PhotoControls = ({
  selectionMode,
  isOperationInProgress,
  onSelectionModeToggle
}: PhotoControlsProps) => {
  return (
    <div className="mb-6 space-y-4">
      {/* Selection Mode Toggle */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onSelectionModeToggle}
            disabled={isOperationInProgress}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isOperationInProgress
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : selectionMode
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {selectionMode ? '❌ Exit Selection' : '☑️ Select Photos'}
          </button>
        </div>
      </div>
    </div>
  )
} 
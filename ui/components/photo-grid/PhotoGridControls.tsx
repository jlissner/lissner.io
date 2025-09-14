import { PhotoControls } from '../PhotoControls'
import { BulkOperations } from '../BulkOperations'

interface PhotoGridControlsProps {
  selectionMode: boolean
  isOperationInProgress: boolean
  selectedPhotos: Set<string>
  deleteProgress: { completed: number; total: number } | null
  downloadProgress: { completed: number; total: number } | null
  onSelectionModeToggle: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDownload: () => void
  onBulkDelete: () => void
}

export function PhotoGridControls({
  selectionMode,
  isOperationInProgress,
  selectedPhotos,
  deleteProgress,
  downloadProgress,
  onSelectionModeToggle,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete
}: PhotoGridControlsProps) {
  return (
    <>
      <PhotoControls
        selectionMode={selectionMode}
        isOperationInProgress={isOperationInProgress}
        onSelectionModeToggle={onSelectionModeToggle}
      />

      <BulkOperations
        selectionMode={selectionMode}
        selectedPhotos={selectedPhotos}
        deleteProgress={deleteProgress}
        downloadProgress={downloadProgress}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onBulkDownload={onBulkDownload}
        onBulkDelete={onBulkDelete}
      />
    </>
  )
}

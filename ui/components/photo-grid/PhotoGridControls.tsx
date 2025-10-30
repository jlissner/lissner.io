import { BulkOperations } from '../BulkOperations'

interface PhotoGridControlsProps {
  isOperationInProgress: boolean
  selectedPhotos: Set<string>
  deleteProgress: { completed: number; total: number } | null
  downloadProgress: { completed: number; total: number } | null
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDownload: () => void
  onBulkDelete: () => void
}

export function PhotoGridControls({
  isOperationInProgress,
  selectedPhotos,
  deleteProgress,
  downloadProgress,
  onSelectAll,
  onClearSelection,
  onBulkDownload,
  onBulkDelete
}: PhotoGridControlsProps) {
  return (
    <BulkOperations
      selectedPhotos={selectedPhotos}
      deleteProgress={deleteProgress}
      downloadProgress={downloadProgress}
      onSelectAll={onSelectAll}
      onClearSelection={onClearSelection}
      onBulkDownload={onBulkDownload}
      onBulkDelete={onBulkDelete}
    />
  )
}

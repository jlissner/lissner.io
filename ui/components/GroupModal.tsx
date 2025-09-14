'use client'

import { createPortal } from 'react-dom'
import { PhotoGroup, Photo } from './utils/photoUtils'
import { BulkOperations } from './BulkOperations'
import { useBulkOperations } from './hooks/useBulkOperations'
import { useAlbumActions } from './hooks/useAlbumActions'
import { useAlbumPhotos } from './hooks/useAlbumPhotos'
import { useFileUpload } from './hooks/useFileUpload'
import { useModalState } from './hooks/useModalState'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import { useAuth } from '@/ui/lib/auth-context'
import { AlbumHeader } from './AlbumHeader'
import { AlbumInteractions } from './AlbumInteractions'
import { AlbumPhotoGrid } from './AlbumPhotoGrid'
import { AlbumReactions } from './AlbumReactions'
import { UploadModal } from './UploadModal'
import PhotoModal from './PhotoModal'

interface GroupModalProps {
  group: PhotoGroup
  onClose: () => void
  onPhotoSelect: (photo: Photo) => void
  onUpdate?: () => void
}

export const GroupModal = ({
  group,
  onClose,
  onPhotoSelect,
  onUpdate
}: GroupModalProps) => {
  const { user } = useAuth()

  // Custom hooks for state management
  const modalState = useModalState()
  
  const albumPhotos = useAlbumPhotos({ group })
  
  const fileUpload = useFileUpload({
    albumId: group.albumId || '',
    onUploadComplete: () => {
      albumPhotos.refreshAlbumPhotos()
      if (onUpdate) onUpdate()
    }
  })

  const infiniteScroll = useInfiniteScroll({
    mounted: modalState.mounted,
    loading: albumPhotos.albumLoading,
    loadingMore: albumPhotos.albumLoadingMore,
    hasMore: albumPhotos.albumHasMore,
    onLoadMore: albumPhotos.loadMoreAlbumPhotos
  })

  const albumActions = useAlbumActions({
    albumId: group.albumId,
    initialComments: group.comments || [],
    initialReactions: group.reactions || [],
    userEmail: user?.email,
    onUpdate: onUpdate || (() => {})
  })

  const bulkOps = useBulkOperations(
    albumPhotos.albumPhotos,
    () => {
      albumPhotos.refreshAlbumPhotos()
      if (onUpdate) onUpdate()
    }
  )

  const selectAllPhotos = () => {
    const allPhotoIds = albumPhotos.albumPhotos.map(p => p.id)
    allPhotoIds.forEach(id => bulkOps.togglePhotoSelection(id))
  }

  if (!modalState.mounted) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <AlbumHeader
          group={group}
          albumPhotos={albumPhotos.albumPhotos}
          onClose={onClose}
          onAddPhotos={fileUpload.openFileDialog}
          onToggleSelection={() => bulkOps.setSelectionMode(!bulkOps.selectionMode)}
          selectionMode={bulkOps.selectionMode}
          isOperationInProgress={bulkOps.isOperationInProgress}
          isUploading={fileUpload.isUploading}
          onAlbumDeleted={onUpdate}
        />

        <BulkOperations
          selectionMode={bulkOps.selectionMode}
          selectedPhotos={bulkOps.selectedPhotos}
          deleteProgress={bulkOps.deleteProgress}
          downloadProgress={bulkOps.downloadProgress}
          onSelectAll={selectAllPhotos}
          onClearSelection={bulkOps.clearSelection}
          onBulkDownload={bulkOps.handleBulkDownload}
          onBulkDelete={bulkOps.handleBulkDelete}
        />

        {/* Main Content - Responsive Layout */}
        <div className="flex flex-col lg:flex-row h-[calc(90vh-200px)]">
          {/* Photo Grid - Full width on mobile, left column on desktop */}
          <div ref={infiniteScroll.scrollContainerRef} className="flex-1 overflow-y-auto">
            <AlbumPhotoGrid
              albumPhotos={albumPhotos.albumPhotos}
              selectionMode={bulkOps.selectionMode}
              selectedPhotos={bulkOps.selectedPhotos}
              isOperationInProgress={bulkOps.isOperationInProgress}
              onPhotoClick={modalState.setSelectedPhoto}
              onPhotoSelect={bulkOps.togglePhotoSelection}
              albumLoading={albumPhotos.albumLoading}
              albumLoadingMore={albumPhotos.albumLoadingMore}
              albumHasMore={albumPhotos.albumHasMore}
            />
          </div>

          {/* Comments Section - Accordion on mobile, sidebar on desktop */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 lg:overflow-y-auto lg:max-h-none">
            {/* Mobile Accordion Header */}
            <div className="lg:hidden">
              <button
                onClick={() => modalState.setCommentsExpanded(!modalState.commentsExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium text-gray-900">Comments</span>
                  {albumActions.localComments.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {albumActions.localComments.length}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${modalState.commentsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Mobile Accordion Content */}
              {modalState.commentsExpanded && (
                <div className="max-h-80 overflow-y-auto">
                  <AlbumInteractions albumActions={albumActions} />
                </div>
              )}
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block h-full">
              <AlbumInteractions albumActions={albumActions} />
            </div>
          </div>
        </div>

        {/* Album Reactions Footer */}
        <AlbumReactions albumActions={albumActions} />

        {/* Hidden file input */}
        <input
          ref={fileUpload.fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={fileUpload.handleFileSelect}
          className="hidden"
        />

        {/* Upload Modal */}
        <UploadModal
          isOpen={fileUpload.showUploadModal}
          fileUploads={fileUpload.fileUploads}
          globalTags={fileUpload.globalTags}
          isUploading={fileUpload.isUploading}
          onGlobalTagsChange={fileUpload.setGlobalTags}
          onStartUpload={fileUpload.startUpload}
          onCancel={fileUpload.cancelUpload}
        />

        {/* Photo Modal for navigation within album */}
        {modalState.selectedPhoto && (
          <PhotoModal
            photo={modalState.selectedPhoto}
            onClose={() => modalState.setSelectedPhoto(null)}
            onUpdate={() => {
              albumPhotos.refreshAlbumPhotos()
              if (onUpdate) onUpdate()
            }}
            onDelete={() => {
              modalState.setSelectedPhoto(null) // Close modal immediately
              albumPhotos.refreshAlbumPhotos() // Refresh album photos
              if (onUpdate) onUpdate() // Refresh main photo grid
            }}
            albumPhotos={albumPhotos.albumPhotos}
            albumHasMore={albumPhotos.albumHasMore}
            albumLoadingMore={albumPhotos.albumLoadingMore}
            estimatedTotalPhotos={group.estimatedTotalCount}
            onNavigateToPhoto={(photo) => modalState.setSelectedPhoto(photo)}
            onLoadMorePhotos={albumPhotos.loadMoreAlbumPhotos}
          />
        )}
      </div>
    </div>
  )

  // Render modal using portal to document.body
  return createPortal(modalContent, document.body)
}

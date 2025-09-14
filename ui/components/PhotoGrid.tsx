'use client'

import { usePhotoData } from './hooks/usePhotoData'
import { useBulkOperations } from './hooks/useBulkOperations'
import { usePhotoGridState } from '../hooks/usePhotoGridState'
import { useUrlNavigation } from '../hooks/useUrlNavigation'
import { 
  getAlbumPhotosForSelectedPhoto,
  selectAllPhotos,
  countFilteredPhotos
} from '../utils/photoGridUtils'
import { PhotoGridControls } from './photo-grid/PhotoGridControls'
import { PhotoGridSidebar } from './photo-grid/PhotoGridSidebar'
import { PhotoGridContent } from './photo-grid/PhotoGridContent'
import { PhotoGridFooter } from './photo-grid/PhotoGridFooter'
import { GroupModal } from './GroupModal'
import PhotoModal from './PhotoModal'
import { Photo, PhotoGroup } from './utils/photoUtils'

export default function PhotoGrid() {
  const photoData = usePhotoData()
  const bulkOps = useBulkOperations(photoData.photos, photoData.refreshPhotos)
  const {
    selectedPhoto,
    selectedGroup,
    expandedComments,
    setSelectedPhoto,
    setSelectedGroup,
    toggleComments
  } = usePhotoGridState()

  // Enhanced setters that update URL
  const handlePhotoSelect = (photo: Photo | null) => {
    setSelectedPhoto(photo)
    if (photo) {
      updateURL(undefined, photo.id)
    } else {
      updateURL()
    }
  }

  const handleGroupSelect = (group: PhotoGroup | null) => {
    setSelectedGroup(group)
    if (group) {
      updateURL(group.albumId)
    } else {
      updateURL()
    }
  }

  const { updateURL } = useUrlNavigation({
    photos: photoData.photos,
    filteredDisplay: photoData.filteredDisplay,
    selectedPhoto,
    selectedGroup,
    setSelectedPhoto,
    setSelectedGroup
  })

  const handleSelectAllPhotos = () => {
    const allPhotoIds = selectAllPhotos(photoData.filteredDisplay)
    bulkOps.selectAllPhotos(allPhotoIds)
  }



  if (photoData.loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
            {/* Album Header Skeleton */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
            
            {/* Photos Grid Skeleton */}
            <div className="grid grid-cols-3 gap-1 p-2">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="relative w-full h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            
            {/* Footer Skeleton */}
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                  <div className="h-6 bg-gray-200 rounded w-8"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (photoData.photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">📷</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos yet</h3>
        <p className="text-gray-600">Upload your first family photo to get started!</p>
      </div>
    )
  }

  return (
    <>
      <PhotoGridControls
        selectionMode={bulkOps.selectionMode}
        isOperationInProgress={bulkOps.isOperationInProgress}
        selectedPhotos={bulkOps.selectedPhotos}
        deleteProgress={bulkOps.deleteProgress}
        downloadProgress={bulkOps.downloadProgress}
        onSelectionModeToggle={() => bulkOps.setSelectionMode(!bulkOps.selectionMode)}
        onSelectAll={handleSelectAllPhotos}
        onClearSelection={bulkOps.clearSelection}
        onBulkDownload={bulkOps.handleBulkDownload}
        onBulkDelete={bulkOps.handleBulkDelete}
      />

      {/* Main Content Area with Sidebar */}
      <div className="flex gap-6">
        <PhotoGridSidebar
          photos={photoData.photos}
          allTags={photoData.allTags}
          allUsers={photoData.allUsers}
          selectedTags={photoData.selectedTags}
          selectedUsers={photoData.selectedUsers}
          filteredPhotosCount={countFilteredPhotos(photoData.filteredDisplay)}
          onPhotoClick={handlePhotoSelect}
          onToggleTag={photoData.toggleTag}
          onToggleUser={photoData.toggleUser}
          onClearAllFilters={photoData.clearAllFilters}
        />

        {/* Photo Grid Container */}
        <div className="flex-1 min-w-0">
          <PhotoGridContent
            filteredDisplay={photoData.filteredDisplay}
            selectedTags={photoData.selectedTags}
            selectedUsers={photoData.selectedUsers}
            selectionMode={bulkOps.selectionMode}
            selectedPhotos={bulkOps.selectedPhotos}
            expandedComments={expandedComments}
            onClearAllFilters={photoData.clearAllFilters}
            onGroupClick={handleGroupSelect}
            onPhotoClick={handlePhotoSelect}
            onSelectionToggle={bulkOps.togglePhotoSelection}
            onCommentToggle={toggleComments}
          />

          <PhotoGridFooter
            showAllAlbums={photoData.showAllAlbums}
            filteredDisplay={photoData.filteredDisplay}
            loadingMore={photoData.loadingMore}
            hasMore={photoData.hasMore}
            photosLength={photoData.photos.length}
            selectedTags={photoData.selectedTags}
            selectedUsers={photoData.selectedUsers}
            onLoadMoreAlbums={() => photoData.setShowAllAlbums(true)}
          />
        </div>
      </div>
      
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => handlePhotoSelect(null)}
          onUpdate={photoData.refreshPhotos}
          onDelete={() => {
            handlePhotoSelect(null) // Close modal immediately
            photoData.refreshPhotos() // Then refresh photos
          }}
          albumPhotos={getAlbumPhotosForSelectedPhoto(selectedPhoto, photoData.filteredDisplay)}
          onNavigateToPhoto={handlePhotoSelect}
        />
      )}

      {selectedGroup && (
        <GroupModal
          group={selectedGroup}
          onClose={() => handleGroupSelect(null)}
          onPhotoSelect={handlePhotoSelect}
          onUpdate={photoData.refreshPhotos}
        />
      )}
    </>
  )
} 
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
      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="bg-gray-200 animate-pulse rounded-lg break-inside-avoid mb-6"
            style={{ height: `${Math.random() * 200 + 200}px` }}
          ></div>
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
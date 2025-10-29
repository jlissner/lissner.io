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
      <div data-center>
        <div data-stack="lg">
          {[...Array(6)].map((_, i) => (
            <article key={i}>
              {/* Album Header Skeleton */}
              <header data-flex="between" style={{ padding: '0.75rem', borderBottom: '1px solid var(--neutral-100)', background: 'var(--neutral-50)' }}>
                <div data-cluster="md">
                  <div data-avatar="sm" data-skeleton style={{ width: '2rem', height: '2rem' }}></div>
                  <div data-stack="sm">
                    <div data-skeleton style={{ height: '1rem', width: '8rem', marginBottom: '0.25rem' }}></div>
                    <div data-skeleton style={{ height: '0.75rem', width: '6rem' }}></div>
                  </div>
                </div>
                <div data-skeleton style={{ height: '1.5rem', width: '4rem' }}></div>
              </header>
              
              {/* Photos Grid Skeleton */}
              <div data-grid="3" style={{ padding: '0.5rem', gap: '0.25rem' }}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} data-skeleton style={{ width: '100%', height: '8rem' }}></div>
                ))}
              </div>
              
              {/* Footer Skeleton */}
              <footer data-flex="between" style={{ padding: '1rem', background: 'var(--neutral-50)', borderTop: '1px solid var(--neutral-100)' }}>
                <div data-cluster="sm">
                  <div data-skeleton style={{ height: '1.5rem', width: '3rem' }}></div>
                  <div data-skeleton style={{ height: '1.5rem', width: '3rem' }}></div>
                  <div data-skeleton style={{ height: '1.5rem', width: '2rem' }}></div>
                </div>
                <div data-skeleton style={{ height: '1rem', width: '4rem' }}></div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (photoData.photos.length === 0) {
    return (
      <div data-center style={{ textAlign: 'center', padding: '3rem 0' }}>
        <div style={{ fontSize: '4rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>📷</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--neutral-900)', marginBottom: '0.5rem' }}>No photos yet</h3>
        <p style={{ color: 'var(--neutral-600)' }}>Upload your first family photo to get started!</p>
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
      <div data-sidebar>
        <main style={{ minWidth: 0 }}>
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
        </main>

        <aside>
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
        </aside>
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
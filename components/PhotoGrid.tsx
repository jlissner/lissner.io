'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Photo, PhotoGroup } from './utils/photoUtils'
import { usePhotoData } from './hooks/usePhotoData'
import { useBulkOperations } from './hooks/useBulkOperations'
import { PhotoControls } from './PhotoControls'
import { BulkOperations } from './BulkOperations'
import { PhotoFilters } from './PhotoFilters'
import { RecentActivity } from './RecentActivity'
import { PhotoCard } from './PhotoCard'
import { PhotoGroupCard } from './PhotoGroupCard'
import { GroupModal } from './GroupModal'
import PhotoModal from './PhotoModal'
import toast from 'react-hot-toast'

export default function PhotoGrid() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const photoData = usePhotoData()
  const bulkOps = useBulkOperations(photoData.photos, photoData.refreshPhotos)
  
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<PhotoGroup | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Handle URL parameters for direct links to albums/photos
  useEffect(() => {
    const albumId = searchParams.get('album')
    const photoId = searchParams.get('photo')
    
    if (photoData.photos.length === 0 && photoData.filteredDisplay.length === 0) {
      // Wait for data to load
      return
    }
    
    // If no URL parameters, close any open modals
    if (!albumId && !photoId) {
      if (selectedGroup) setSelectedGroup(null)
      if (selectedPhoto) setSelectedPhoto(null)
      return
    }
    
    // Open album if specified and not already open
    if (albumId && !selectedGroup) {
      const group = photoData.filteredDisplay.find(g => g.albumId === albumId)
      if (group) {
        setSelectedGroup(group)
      }
    }
    
    // Close album if URL changed to different album or no album
    if (!albumId && selectedGroup) {
      setSelectedGroup(null)
    }
    
    // Open photo if specified and not already open
    if (photoId && !selectedPhoto) {
      const photo = photoData.photos.find(p => p.id === photoId)
      if (photo) {
        setSelectedPhoto(photo)
      }
    }
    
    // Close photo if URL changed to different photo or no photo
    if (!photoId && selectedPhoto) {
      setSelectedPhoto(null)
    }
  }, [searchParams, photoData.photos, photoData.filteredDisplay, selectedGroup, selectedPhoto])

  // Update URL when modals open/close
  const updateURL = (albumId?: string, photoId?: string) => {
    const params = new URLSearchParams()
    if (albumId) params.set('album', albumId)
    if (photoId) params.set('photo', photoId)
    
    const queryString = params.toString()
    const newURL = queryString ? `/?${queryString}` : '/'
    
    // Use replace to avoid creating browser history entries for every modal open/close
    router.replace(newURL)
  }

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

  // Get the album photos for the selected photo
  const getAlbumPhotosForSelectedPhoto = (): Photo[] | undefined => {
    if (!selectedPhoto) return undefined
    
    // Find the group that contains this photo
    const containingGroup = photoData.filteredDisplay.find(group => 
      group.photos.some(p => p.id === selectedPhoto.id)
    )
    
    // If it's a group (album), return all photos in the group
    if (containingGroup && containingGroup.isGroup) {
      return containingGroup.photos.sort((a, b) => 
        new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      )
    }
    
    // If it's a single photo, no album navigation
    return undefined
  }

  const toggleComments = (photoId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const selectAllPhotos = () => {
    const allPhotoIds: string[] = []
    photoData.filteredDisplay.forEach(group => {
      group.photos.forEach(photo => allPhotoIds.push(photo.id))
    })
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
      {/* Controls */}
      <PhotoControls
        selectionMode={bulkOps.selectionMode}
        isOperationInProgress={bulkOps.isOperationInProgress}
        onSelectionModeToggle={() => bulkOps.setSelectionMode(!bulkOps.selectionMode)}
      />

      {/* Bulk Operations */}
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

      {/* Main Content Area with Sidebar */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-6">
          <RecentActivity
            photos={photoData.photos}
            onPhotoClick={handlePhotoSelect}
          />
          
          <PhotoFilters
            allTags={photoData.allTags}
            allUsers={photoData.allUsers}
            selectedTags={photoData.selectedTags}
            selectedUsers={photoData.selectedUsers}
            totalPhotos={photoData.photos.length}
            filteredPhotos={photoData.filteredDisplay.reduce((acc, group) => acc + group.photos.length, 0)}
            onToggleTag={photoData.toggleTag}
            onToggleUser={photoData.toggleUser}
            onClearAllFilters={photoData.clearAllFilters}
          />
        </div>

        {/* Photo Grid Container */}
        <div className="flex-1 min-w-0">
          {/* Photo Grid */}
          {photoData.filteredDisplay.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No photos match your filters</h3>
              <p className="text-gray-600 mb-4">
                Try removing some {photoData.selectedTags.length > 0 && photoData.selectedUsers.length > 0 ? 'tags or users' : photoData.selectedTags.length > 0 ? 'tags' : 'users'} or clearing all filters.
              </p>
              <button
                onClick={photoData.clearAllFilters}
                className="btn-primary"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {photoData.filteredDisplay.map((group, index) => (
                <div key={group.id} className="mb-6">
                  {group.isGroup ? (
                    <PhotoGroupCard
                      group={group}
                      selectionMode={bulkOps.selectionMode}
                      selectedPhotos={bulkOps.selectedPhotos}
                      onGroupClick={handleGroupSelect}
                      onPhotoClick={(photoId) => {
                        const photo = group.photos.find(p => p.id === photoId)
                        if (photo) handlePhotoSelect(photo)
                      }}
                      onSelectionToggle={bulkOps.togglePhotoSelection}
                      priority={index < 2}
                    />
                  ) : (
                    <PhotoCard
                      photo={group.photos[0]}
                      selectionMode={bulkOps.selectionMode}
                      selectedPhotos={bulkOps.selectedPhotos}
                      selectedTags={photoData.selectedTags}
                      expandedComments={expandedComments}
                      onPhotoClick={() => {
                        if (bulkOps.selectionMode) {
                          bulkOps.togglePhotoSelection(group.photos[0].id)
                        } else {
                          handlePhotoSelect(group.photos[0])
                        }
                      }}
                      onSelectionToggle={bulkOps.togglePhotoSelection}
                      onCommentToggle={toggleComments}
                      priority={index < 2}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load More Albums Button */}
          {!photoData.showAllAlbums && photoData.filteredDisplay.filter(g => g.isGroup).length >= 4 && (
            <div className="flex justify-center py-8">
              <button
                onClick={() => photoData.setShowAllAlbums(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Load More Albums
              </button>
            </div>
          )}

          {/* Infinite Scroll Loading Indicator */}
          {photoData.loadingMore && (
            <div className="flex justify-center py-8">
              <div className="flex items-center space-x-2 text-gray-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span>Loading more photos...</span>
              </div>
            </div>
          )}

          {/* End of Photos Indicator */}
          {!photoData.hasMore && photoData.photos.length > 0 && photoData.selectedTags.length === 0 && photoData.selectedUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-gray-400 text-4xl mb-2">🎉</div>
              <p>You've seen all the photos!</p>
            </div>
          )}
        </div>
      </div>
      
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => handlePhotoSelect(null)}
          onUpdate={photoData.refreshPhotos}
          onDelete={photoData.refreshPhotos}
          albumPhotos={getAlbumPhotosForSelectedPhoto()}
          onNavigateToPhoto={(photo) => handlePhotoSelect(photo)}
        />
      )}

      {selectedGroup && (
        <GroupModal
          group={selectedGroup}
          onClose={() => handleGroupSelect(null)}
          onPhotoSelect={(photo) => {
            handlePhotoSelect(photo)
          }}
          onUpdate={photoData.refreshPhotos}
        />
      )}
    </>
  )
} 
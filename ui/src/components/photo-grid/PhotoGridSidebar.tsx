import { Photo } from '../utils/photoUtils'
import { RecentActivity } from '../RecentActivity'
import { PhotoFilters } from '../PhotoFilters'

interface PhotoGridSidebarProps {
  photos: Photo[]
  allTags: string[]
  allUsers: string[]
  selectedTags: string[]
  selectedUsers: string[]
  filteredPhotosCount: number
  onPhotoClick: (photo: Photo) => void
  onToggleTag: (tag: string) => void
  onToggleUser: (user: string) => void
  onClearAllFilters: () => void
}

export function PhotoGridSidebar({
  photos,
  allTags,
  allUsers,
  selectedTags,
  selectedUsers,
  filteredPhotosCount,
  onPhotoClick,
  onToggleTag,
  onToggleUser,
  onClearAllFilters
}: PhotoGridSidebarProps) {
  return (
    <div className="w-64 flex-shrink-0 space-y-6">
      <RecentActivity
        photos={photos}
        onPhotoClick={onPhotoClick}
      />
      
      <PhotoFilters
        allTags={allTags}
        allUsers={allUsers}
        selectedTags={selectedTags}
        selectedUsers={selectedUsers}
        totalPhotos={photos.length}
        filteredPhotos={filteredPhotosCount}
        onToggleTag={onToggleTag}
        onToggleUser={onToggleUser}
        onClearAllFilters={onClearAllFilters}
      />
    </div>
  )
}

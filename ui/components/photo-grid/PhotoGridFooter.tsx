import { 
  shouldShowLoadMoreAlbums, 
  shouldShowEndOfPhotos 
} from '../../utils/photoGridUtils'
import { PhotoGroup } from '../utils/photoUtils'

interface PhotoGridFooterProps {
  showAllAlbums: boolean
  filteredDisplay: PhotoGroup[]
  loadingMore: boolean
  hasMore: boolean
  photosLength: number
  selectedTags: string[]
  selectedUsers: string[]
  onLoadMoreAlbums: () => void
}

export function PhotoGridFooter({
  showAllAlbums,
  filteredDisplay,
  loadingMore,
  hasMore,
  photosLength,
  selectedTags,
  selectedUsers,
  onLoadMoreAlbums
}: PhotoGridFooterProps) {
  return (
    <>
      {/* Load More Albums Button */}
      {shouldShowLoadMoreAlbums(showAllAlbums, filteredDisplay) && (
        <div className="flex justify-center py-8">
          <button
            onClick={onLoadMoreAlbums}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Load More Albums
          </button>
        </div>
      )}

      {/* Infinite Scroll Loading Indicator */}
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <span>Loading more photos...</span>
          </div>
        </div>
      )}

      {/* End of Photos Indicator */}
      {shouldShowEndOfPhotos(hasMore, photosLength, selectedTags, selectedUsers) && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-gray-400 text-4xl mb-2">🎉</div>
          <p>You've seen all the photos!</p>
        </div>
      )}
    </>
  )
}

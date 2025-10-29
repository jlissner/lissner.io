'use client'

import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from '../utils/photoUtils'
import { formatHeaderSubtitle, shouldShowAlbumName, getAlbumBadgeText } from '../../utils/albumHeaderUtils'

interface AlbumHeaderProps {
  uploadedBy: string
  uploadedAt: string
  albumName?: string
  albumId?: string
  totalPhotos: number
  photosToShow: number
  estimatedTotalCount?: number
  potentiallyIncomplete?: boolean
}

export const AlbumHeader = ({
  uploadedBy,
  uploadedAt,
  albumName,
  albumId,
  totalPhotos,
  photosToShow,
  estimatedTotalCount,
  potentiallyIncomplete
}: AlbumHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full ${getUserColor(uploadedBy)} flex items-center justify-center text-white text-sm font-medium`}>
          {getUserInitials(uploadedBy)}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-gray-900">
              {getDisplayName(uploadedBy)}
            </div>
            {shouldShowAlbumName(albumName, albumId) && (
              <>
                <span className="text-xs text-gray-500">•</span>
                <div className="text-xs text-gray-700 font-medium">
                  {albumName}
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {formatHeaderSubtitle(
              totalPhotos,
              photosToShow,
              uploadedAt,
              getRelativeTime,
              estimatedTotalCount,
              potentiallyIncomplete
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
          {getAlbumBadgeText()}
        </div>
      </div>
    </div>
  )
}

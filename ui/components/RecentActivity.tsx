'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import { Photo } from './utils/photoUtils'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'

interface RecentActivityProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

interface UserActivity {
  email: string
  photoCount: number
  latestUpload: string
  mostRecentPhoto: Photo
}

export const RecentActivity = ({ photos, onPhotoClick }: RecentActivityProps) => {
  const recentUsers = useMemo(() => {
    // Group photos by user and get recent activity
    const userActivity = new Map<string, UserActivity>()
    
    photos.forEach(photo => {
      const user = photo.uploadedBy
      if (!userActivity.has(user)) {
        userActivity.set(user, {
          email: user,
          photoCount: 0,
          latestUpload: photo.uploadedAt,
          mostRecentPhoto: photo
        })
      }
      
      const activity = userActivity.get(user)!
      activity.photoCount++
      
      // Keep the most recent photo
      if (new Date(photo.uploadedAt) > new Date(activity.latestUpload)) {
        activity.latestUpload = photo.uploadedAt
        activity.mostRecentPhoto = photo
      }
    })
    
    // Convert to array and sort by latest upload
    return Array.from(userActivity.values())
      .sort((a, b) => new Date(b.latestUpload).getTime() - new Date(a.latestUpload).getTime())
      .slice(0, 6) // Show max 6 users
  }, [photos])

  if (recentUsers.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentUsers.map((userInfo) => (
          <div key={userInfo.email} className="flex items-center space-x-3">
            <div className={`w-7 h-7 rounded-full ${getUserColor(userInfo.email)} flex items-center justify-center text-white text-xs font-medium`}>
              {getUserInitials(userInfo.email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {getDisplayName(userInfo.email)}
              </div>
              <div className="text-xs text-gray-500">
                {userInfo.photoCount === 1 
                  ? `1 photo • ${getRelativeTime(userInfo.latestUpload)}`
                  : `${userInfo.photoCount} photos • ${getRelativeTime(userInfo.latestUpload)}`
                }
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="relative w-8 h-8 rounded overflow-hidden">
                <Image
                  src={userInfo.mostRecentPhoto.thumbnailUrl || userInfo.mostRecentPhoto.url}
                  alt={userInfo.mostRecentPhoto.caption || 'Latest photo'}
                  fill
                  sizes="32px"
                  className="object-cover cursor-pointer hover:opacity-80"
                  onClick={() => onPhotoClick(userInfo.mostRecentPhoto)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
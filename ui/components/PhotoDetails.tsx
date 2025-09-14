'use client'

interface Photo {
  id: string
  caption?: string
  uploadedBy: string
  uploadedAt: string
  takenAt?: string | null
  location?: {
    latitude: number
    longitude: number
    altitude?: number | null
  } | null
  [key: string]: any
}

interface PhotoDetailsProps {
  photo: Photo
}

export const PhotoDetails = ({ photo }: PhotoDetailsProps) => {
  return (
    <div className="p-4 overflow-y-auto flex-1">
      {/* Caption and Meta */}
      <div className="mb-6">
        {photo.caption && (
          <p className="font-medium text-gray-900 mb-2">{photo.caption}</p>
        )}
        <div className="text-sm text-gray-600 space-y-1">
          <p>Uploaded by {photo.uploadedBy}</p>
          {photo.takenAt && (
            <p>
              📸 Taken: {new Date(photo.takenAt).toLocaleDateString()}
            </p>
          )}
          <p>
            📤 Uploaded: {new Date(photo.uploadedAt).toLocaleDateString()}
          </p>
          {photo.location && (
            <p>
              📍 Location: 
              <a 
                href={`https://maps.google.com/?q=${photo.location.latitude},${photo.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 ml-1"
              >
                {photo.location.latitude.toFixed(4)}, {photo.location.longitude.toFixed(4)}
              </a>
              {photo.location.altitude && (
                <span className="text-xs"> (Alt: {Math.round(photo.location.altitude)}m)</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 
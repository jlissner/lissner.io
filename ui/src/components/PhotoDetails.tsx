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
    <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
      {/* Caption and Meta */}
      <div style={{ marginBottom: '1.5rem' }}>
        {photo.caption && (
          <p style={{ 
            fontWeight: 500, 
            color: 'rgba(255, 255, 255, 0.9)', 
            marginBottom: '0.5rem' 
          }}>
            {photo.caption}
          </p>
        )}
        <div data-stack="sm" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
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
                style={{ 
                  color: 'var(--primary-400)', 
                  textDecoration: 'none',
                  marginLeft: '0.25rem'
                }}
              >
                {photo.location.latitude.toFixed(4)}, {photo.location.longitude.toFixed(4)}
              </a>
              {photo.location.altitude && (
                <span style={{ fontSize: '0.75rem' }}> (Alt: {Math.round(photo.location.altitude)}m)</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 
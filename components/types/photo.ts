export interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

export interface Reaction {
  id: string
  type: string // Changed to support any emoji
  author: string
  createdAt: string
}

export interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  originalUrl: string
  s3Key: string
  thumbnailS3Key: string
  originalS3Key: string
  caption: string
  uploadedBy: string
  uploadedAt: string
  takenAt: string | null
  location: {
    latitude: number
    longitude: number
    altitude?: number | null
  } | null
  tags: string[]
  comments: Comment[]
  reactions: Reaction[]
} 
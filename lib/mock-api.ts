// Mock API for local development - faster iteration without AWS calls

const MOCK_USER = {
  id: 'mock-user-1',
  email: 'test@lissner.io',
  isAdmin: true,
  createdAt: new Date().toISOString(),
}

interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

interface Reaction {
  id: string
  type: 'like' | 'love' | 'laugh'
  author: string
}

interface Photo {
  id: string
  url: string
  thumbnailUrl?: string
  caption: string
  uploadedBy: string
  uploadedAt: string
  uploadSessionId?: string
  albumName?: string
  takenAt: string | null
  location: {
    latitude: number
    longitude: number
    altitude?: number | null
  } | null
  comments: Comment[]
  reactions: Reaction[]
  tags: string[]
}

const MOCK_PHOTOS: Photo[] = [
  {
    id: 'photo-1',
    url: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400',
    caption: 'Family vacation 2023',
    uploadedBy: 'test@lissner.io',
    uploadedAt: '2023-12-01T10:00:00Z',
    takenAt: '2023-11-28T14:30:00Z',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: 10
    },
    comments: [
      {
        id: 'comment-1',
        content: 'Beautiful memories!',
        author: 'family@lissner.io',
        createdAt: '2023-12-01T11:00:00Z',
      }
    ],
    reactions: [
      {
        id: 'reaction-1',
        type: 'love',
        author: 'family@lissner.io',
      }
    ],
    tags: ['vacation', 'family'],
  },
  {
    id: 'photo-2', 
    url: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400',
    caption: 'Weekend BBQ',
    uploadedBy: 'dad@lissner.io',
    uploadedAt: '2023-11-15T15:30:00Z',
    takenAt: '2023-11-15T12:00:00Z',
    location: {
      latitude: 34.0522,
      longitude: -118.2437,
      altitude: null
    },
    comments: [],
    reactions: [
      {
        id: 'reaction-2',
        type: 'like',
        author: 'test@lissner.io',
      }
    ],
    tags: ['bbq', 'weekend'],
  },
  // Additional mock photos for testing pagination
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `photo-${i + 3}`,
    url: `https://picsum.photos/400/300?random=${i + 3}`,
    caption: `Mock photo ${i + 3}`,
    uploadedBy: i % 2 === 0 ? 'test@lissner.io' : 'family@lissner.io',
    uploadedAt: new Date(2023, 10, i + 1).toISOString(),
    takenAt: new Date(2023, 10, i).toISOString(),
    location: i % 4 === 0 ? {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
      altitude: Math.random() * 100
    } : null,
    comments: [],
    reactions: [],
    tags: i % 3 === 0 ? ['mock', 'test'] : ['sample'],
  } as Photo))
]

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi = {
  // Auth APIs
  sendMagicLink: async (email: string) => {
    await delay(500)
    return { message: 'Magic link sent to your email' }
  },

  verifyMagicLink: async (token: string) => {
    await delay(800)
    return {
      token: 'mock-jwt-token',
      user: MOCK_USER,
    }
  },

  getCurrentUser: async () => {
    await delay(200)
    return MOCK_USER
  },

  // Photo APIs
  getPhotos: async (lastKey?: string, limit = 6) => { // Smaller limit for testing
    await delay(300)
    
    // Simulate pagination for mock data
    const startIndex = lastKey ? parseInt(lastKey) : 0
    const endIndex = startIndex + limit
    const paginatedPhotos = MOCK_PHOTOS.slice(startIndex, endIndex)
    
    // Create next lastKey if there are more photos
    const nextLastKey = endIndex < MOCK_PHOTOS.length ? endIndex.toString() : null
    
    return { 
      photos: paginatedPhotos,
      lastKey: nextLastKey
    }
  },

  getRecentActivity: async (limit = 50) => {
    await delay(300)
    
    // Group photos by user and get recent activity
    const userActivity: { [key: string]: {
      email: string;
      photoCount: number;
      latestUpload: string;
      recentPhotos: Array<{
        id: string;
        url: string;
        caption: string;
        uploadedAt: string;
        takenAt: string | null;
      }>;
    } } = {}
    
    MOCK_PHOTOS.slice(0, limit).forEach(photo => {
      const user = photo.uploadedBy
      if (!userActivity[user]) {
        userActivity[user] = {
          email: user,
          photoCount: 0,
          latestUpload: photo.uploadedAt,
          recentPhotos: []
        }
      }
      
      userActivity[user].photoCount++
      userActivity[user].recentPhotos.push({
        id: photo.id,
        url: photo.url, // Assuming a thumbnailUrl is not available in the current mock data
        caption: photo.caption,
        uploadedAt: photo.uploadedAt,
        takenAt: photo.takenAt
      })
      
      // Keep only the most recent 3 photos per user
      if (userActivity[user].recentPhotos.length > 3) {
        userActivity[user].recentPhotos.pop()
      }
    })

    // Convert to array and sort by latest upload
    const activity = Object.values(userActivity).sort((a, b) => 
      new Date(b.latestUpload).getTime() - new Date(a.latestUpload).getTime()
    )

    return { activity }
  },

  uploadPhoto: async (file: File, caption?: string) => {
    await delay(2000) // Simulate upload time
    const newPhoto = {
      id: `photo-${Date.now()}`,
      url: URL.createObjectURL(file),
      caption: caption || '',
      uploadedBy: MOCK_USER.email,
      uploadedAt: new Date().toISOString(),
      takenAt: null,
      location: null,
      comments: [],
      reactions: [],
      tags: [],
    }
    MOCK_PHOTOS.unshift(newPhoto)
    return { photo: newPhoto, message: 'Photo uploaded successfully' }
  },

  addComment: async (photoId: string, content: string) => {
    await delay(300)
    const photo = MOCK_PHOTOS.find(p => p.id === photoId)
    if (photo) {
      const comment = {
        id: `comment-${Date.now()}`,
        content,
        author: MOCK_USER.email,
        createdAt: new Date().toISOString(),
      }
      photo.comments.push(comment)
      return { comment, message: 'Comment added successfully' }
    }
    throw new Error('Photo not found')
  },

  addReaction: async (photoId: string, type: string) => {
    await delay(200)
    const photo = MOCK_PHOTOS.find(p => p.id === photoId)
    if (photo) {
      // Add new reaction (allow multiple per user)
      photo.reactions.push({
        id: `reaction-${Date.now()}`,
        type,
        author: MOCK_USER.email,
        createdAt: new Date().toISOString(),
      })
      return { message: 'Reaction added successfully' }
    }
    throw new Error('Photo not found')
  },

  removeReaction: async (photoId: string, reactionId?: string) => {
    await delay(200)
    const photo = MOCK_PHOTOS.find(p => p.id === photoId)
    if (photo) {
      if (reactionId) {
        // Remove specific reaction by ID
        photo.reactions = photo.reactions.filter(r => r.id !== reactionId)
      } else {
        // Legacy: remove all user's reactions
        photo.reactions = photo.reactions.filter(r => r.author !== MOCK_USER.email)
      }
      return { message: 'Reaction removed successfully' }
    }
    throw new Error('Photo not found')
  },

  addTag: async (photoId: string, tag: string) => {
    await delay(200)
    const photo = MOCK_PHOTOS.find(p => p.id === photoId)
    if (photo) {
      if (!photo.tags.includes(tag.toLowerCase())) {
        photo.tags.push(tag.toLowerCase())
      }
      return { message: 'Tag added successfully' }
    }
    throw new Error('Photo not found')
  },

  // Admin APIs
  addFamilyMember: async (email: string, isAdmin = false) => {
    await delay(400)
    const newUser = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase(),
      isAdmin,
      createdAt: new Date().toISOString(),
    }
    return { 
      message: 'Family member added successfully',
      user: newUser
    }
  },

  removeFamilyMember: async (userId: string) => {
    await delay(400) 
    return { message: 'Family member removed successfully' }
  },

  getUsers: async () => {
    await delay(300)
    return {
      users: [
        MOCK_USER,
        {
          id: 'user-2',
          email: 'family@lissner.io',
          isAdmin: false,
          createdAt: '2023-11-01T10:00:00Z',
          lastLogin: '2023-12-01T09:00:00Z',
        }
      ]
    }
  },

  updateUserAdmin: async (userId: string, isAdmin: boolean) => {
    await delay(400)
    return { message: `User admin status ${isAdmin ? 'granted' : 'removed'} successfully` }
  },

  getAlbums: async () => {
    await delay(300)
    // Group photos by uploadSessionId to simulate albums
    const albumsMap = new Map()
    
    MOCK_PHOTOS.forEach(photo => {
      const uploadSessionId = photo.uploadSessionId || `legacy-${photo.id}`
      if (!albumsMap.has(uploadSessionId)) {
        albumsMap.set(uploadSessionId, {
          id: uploadSessionId,
          name: photo.albumName || `Album from ${new Date(photo.uploadedAt).toLocaleDateString()}`,
          uploadedBy: photo.uploadedBy,
          createdAt: photo.uploadedAt,
          photoCount: 0,
          photos: []
        })
      }
      
      const album = albumsMap.get(uploadSessionId)
      album.photoCount++
      album.photos.push({
        id: photo.id,
        url: photo.thumbnailUrl || photo.url,
        caption: photo.caption
      })
    })
    
    const albums = Array.from(albumsMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return { albums }
  },

  updateAlbumName: async (albumId: string, name: string) => {
    await delay(300)
    // Update album name for all photos in the album
    const albumPhotos = MOCK_PHOTOS.filter(p => p.uploadSessionId === albumId)
    if (albumPhotos.length === 0) {
      throw new Error('Album not found')
    }
    
    albumPhotos.forEach(photo => {
      photo.albumName = name
    })
    
    return { message: 'Album name updated successfully' }
  },

  // Album Comments and Reactions
  addAlbumComment: async (albumId: string, content: string) => {
    await delay(300)
    const comment = {
      id: `album-comment-${Date.now()}`,
      content,
      author: MOCK_USER.email,
      createdAt: new Date().toISOString(),
    }
    return { comment, message: 'Album comment added successfully' }
  },

  deleteAlbumComment: async (albumId: string, commentId: string) => {
    await delay(300)
    return { message: 'Album comment deleted successfully' }
  },

  addAlbumReaction: async (albumId: string, type: string) => {
    await delay(200)
    return { message: 'Album reaction added successfully' }
  },

  removeAlbumReaction: async (albumId: string, reactionId?: string) => {
    await delay(200)
    return { message: 'Album reaction removed successfully' }
  }
}

// Switch between real API and mock API based on environment
export const isDevelopment = process.env.NODE_ENV === 'development'
export const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true' 
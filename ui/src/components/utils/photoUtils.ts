export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  originalUrl: string;
  s3Key: string;
  thumbnailS3Key: string;
  originalS3Key: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  uploadSessionId?: string;
  albumName?: string;
  takenAt: string | null;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
  } | null;
  tags: string[];
  comments: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
  reactions: Array<{
    id: string;
    type: string; // Changed to support any emoji
    author: string;
    createdAt: string;
  }>;
}

export interface PhotoGroup {
  id: string;
  photos: Photo[];
  uploadedBy: string;
  uploadedAt: string;
  isGroup: boolean;
  potentiallyIncomplete?: boolean;
  albumId?: string;
  albumName?: string;
  estimatedTotalCount?: number;
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
  reactions?: Array<{
    id: string;
    type: string; // Changed to support any emoji
    author: string;
    createdAt: string;
  }>;
}

// Helper function to get user initials for avatar
export const getUserInitials = (email: string) => {
  const name = email.split('@')[0]
  return name.charAt(0).toUpperCase() + (name.charAt(1) || '').toUpperCase()
}

// Helper function to get consistent color for user avatars
export const getUserColor = (email: string) => {
  const colors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ]
  
  // Generate a consistent index based on email
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Helper function to get relative time
export const getRelativeTime = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  
  if (diffHours < 1) {
    return 'Just now'
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else if (diffWeeks < 4) {
    return `${diffWeeks}w ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Helper function to get display name from email
export const getDisplayName = (email: string) => {
  const name = email.split('@')[0]
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ')
}
 
// Updated API Client for SQLite Backend
// Solves all pagination and filtering issues

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 🎯 Album-specific pagination (solves the main issue!)
export const getAlbumPhotos = async (
  albumId: string, 
  page: number = 1, 
  limit: number = 20
) => {
  const response = await fetch(
    `${API_BASE}/api/albums/${albumId}/photos?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch album photos');
  }
  
  return response.json();
};

// 🎯 Multi-filter photos (much more powerful!)
export const getPhotos = async (options: {
  page?: number;
  limit?: number;
  tags?: string[];
  user?: string;
  album?: string;
  startDate?: string;
  endDate?: string;
  hasLocation?: boolean;
  sort?: 'uploaded_at' | 'taken_at';
} = {}) => {
  const {
    page = 1,
    limit = 20,
    tags,
    user,
    album,
    startDate,
    endDate,
    hasLocation,
    sort = 'uploaded_at'
  } = options;
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort
  });
  
  if (tags && tags.length > 0) {
    params.append('tags', tags.join(','));
  }
  if (user) params.append('user', user);
  if (album) params.append('album', album);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (hasLocation !== undefined) params.append('hasLocation', hasLocation.toString());
  
  const response = await fetch(`${API_BASE}/api/photos?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch photos');
  }
  
  return response.json();
};

// 🎯 Albums with proper pagination
export const getAlbums = async (
  page: number = 1,
  limit: number = 10,
  user?: string
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (user) params.append('user', user);
  
  const response = await fetch(`${API_BASE}/api/albums?${params}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch albums');
  }
  
  return response.json();
};

// 🎯 Recent activity (much more efficient!)
export const getRecentActivity = async (days: number = 7) => {
  const response = await fetch(`${API_BASE}/api/activity/recent?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch recent activity');
  }
  
  return response.json();
};

// 🎯 Search functionality (new!)
export const searchPhotos = async (query: string, limit: number = 20) => {
  const response = await fetch(
    `${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to search photos');
  }
  
  return response.json();
};

// 🎯 Photo details with all relations in one call
export const getPhotoDetails = async (photoId: string) => {
  const response = await fetch(`${API_BASE}/api/photos/${photoId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch photo details');
  }
  
  return response.json();
};

// 🎯 App statistics (new!)
export const getAppStats = async () => {
  const response = await fetch(`${API_BASE}/api/stats`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch app statistics');
  }
  
  return response.json();
};

// Helper function to get auth token
const getAuthToken = () => {
  return document.cookie.split('auth_token=')[1]?.split(';')[0] || '';
}; 
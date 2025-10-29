import axios from 'axios'
import Cookies from 'js-cookie'
import { mockApi, useMockApi } from './mock-api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth APIs
export const sendMagicLink = async (email: string) => {
  if (useMockApi) return mockApi.sendMagicLink(email)
  const response = await api.post('/auth/magic-link', { email })
  return response.data
}

export const verifyMagicLink = async (token: string) => {
  if (useMockApi) return mockApi.verifyMagicLink(token)
  const response = await api.post('/auth/verify', { token })
  return response.data
}

export const getCurrentUser = async () => {
  if (useMockApi) return mockApi.getCurrentUser()
  const response = await api.get('/auth/me')
  return response.data
}

// Photo APIs
export const getPhotos = async (lastKey?: string, limit = 20) => {
  if (useMockApi) return mockApi.getPhotos(lastKey, limit)
  let url = `/photos?limit=${limit}`
  if (lastKey) url += `&lastKey=${encodeURIComponent(lastKey)}`
  const response = await api.get(url)
  return response.data
}

export const getAlbumPhotos = async (albumId: string, lastKey?: string, limit = 20) => {
  if (useMockApi) return mockApi.getPhotos(lastKey, limit) // Mock doesn't support album-specific yet
  let url = `/photos/album/${albumId}?limit=${limit}`
  if (lastKey) url += `&lastKey=${encodeURIComponent(lastKey)}`
  const response = await api.get(url)
  return response.data
}

export const getRecentActivity = async (limit = 50) => {
  if (useMockApi) return mockApi.getRecentActivity(limit)
  const response = await api.get(`/photos/recent-activity?limit=${limit}`)
  return response.data
}

export const uploadPhoto = async (file: File, caption?: string) => {
  if (useMockApi) return mockApi.uploadPhoto(file, caption)
  const formData = new FormData()
  formData.append('photo', file)
  if (caption) formData.append('caption', caption)
  
  const response = await api.post('/photos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const uploadPhotoWithProgress = async (
  file: File, 
  caption?: string, 
  tags?: string[],
  onProgress?: (progress: number) => void,
  uploadSessionId?: string,
  albumName?: string
) => {
  if (useMockApi) return mockApi.uploadPhoto(file, caption)
  const formData = new FormData()
  formData.append('photo', file)
  if (caption) formData.append('caption', caption)
  if (tags && tags.length > 0) formData.append('tags', JSON.stringify(tags))
  if (uploadSessionId) formData.append('uploadSessionId', uploadSessionId)
  if (albumName) formData.append('albumName', albumName)
  
  const response = await api.post('/photos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  })
  return response.data
}

export const addComment = async (photoId: string, content: string) => {
  if (useMockApi) return mockApi.addComment(photoId, content)
  const response = await api.post(`/photos/${photoId}/comments`, { content })
  return response.data
}

export const deleteComment = async (photoId: string, commentId: string) => {
  const response = await api.delete(`/photos/${photoId}/comments/${commentId}`)
  return response.data
}

export const addReaction = async (photoId: string, type: string) => {
  if (useMockApi) return mockApi.addReaction(photoId, type)
  const response = await api.post(`/photos/${photoId}/reactions`, { type })
  return response.data
}

export const removeReaction = async (photoId: string, reactionId?: string) => {
  // If reactionId is provided, remove specific reaction, otherwise remove all user's reactions (legacy)
  const url = reactionId 
    ? `/photos/${photoId}/reactions/${reactionId}`
    : `/photos/${photoId}/reactions`
  const response = await api.delete(url)
  return response.data
}

export const addTag = async (photoId: string, tag: string) => {
  const response = await api.post(`/photos/${photoId}/tags`, { tag })
  return response.data
}

export const removeTag = async (photoId: string, tag: string) => {
  const response = await api.delete(`/photos/${photoId}/tags/${encodeURIComponent(tag)}`)
  return response.data
}

export const deletePhoto = async (photoId: string) => {
  const response = await api.delete(`/photos/${photoId}`)
  return response.data
}

// Admin APIs
export const addFamilyMember = async (email: string, isAdmin = false) => {
  if (useMockApi) return mockApi.addFamilyMember(email, isAdmin)
  const response = await api.post('/admin/users', { email, isAdmin })
  return response.data
}

export const removeFamilyMember = async (userId: string) => {
  if (useMockApi) return mockApi.removeFamilyMember(userId)
  const response = await api.delete(`/admin/users/${userId}`)
  return response.data
}

export const getUsers = async () => {
  const response = await api.get('/admin/users')
  return response.data
}

export const updateUserAdmin = async (userId: string, isAdmin: boolean) => {
  const response = await api.patch(`/admin/users/${userId}`, { isAdmin })
  return response.data
}

export const getAlbums = async () => {
  if (useMockApi) return mockApi.getAlbums()
  const response = await api.get('/photos/albums')
  return response.data
}

export const updateAlbumName = async (albumId: string, name: string) => {
  if (useMockApi) return mockApi.updateAlbumName(albumId, name)
  const response = await api.put(`/photos/albums/${albumId}`, { name })
  return response.data
}

// Album Comments and Reactions APIs
export const addAlbumComment = async (albumId: string, content: string) => {
  if (useMockApi) return mockApi.addAlbumComment(albumId, content)
  const response = await api.post(`/photos/albums/${albumId}/comments`, { content })
  return response.data
}

export const deleteAlbumComment = async (albumId: string, commentId: string) => {
  if (useMockApi) return mockApi.deleteAlbumComment?.(albumId, commentId) || { message: 'Comment deleted successfully' }
  const response = await api.delete(`/photos/albums/${albumId}/comments/${commentId}`)
  return response.data
}

export const addAlbumReaction = async (albumId: string, type: string) => {
  if (useMockApi) return mockApi.addAlbumReaction(albumId, type)
  const response = await api.post(`/photos/albums/${albumId}/reactions`, { type })
  return response.data
}

export const removeAlbumReaction = async (albumId: string, reactionId?: string) => {
  if (useMockApi) return mockApi.removeAlbumReaction(albumId, reactionId)
  // If reactionId is provided, remove specific reaction, otherwise remove all user's reactions (legacy)
  const url = reactionId 
    ? `/photos/albums/${albumId}/reactions/${reactionId}`
    : `/photos/albums/${albumId}/reactions`
  const response = await api.delete(url)
  return response.data
}

export const deleteAlbum = async (albumId: string) => {
  if (useMockApi) return mockApi.deleteAlbum(albumId)
  const response = await api.delete(`/photos/albums/${albumId}`)
  return response.data
}
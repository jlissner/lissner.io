'use client'

import { useState, useEffect } from 'react'
import { Photo } from '../types/photo'

export const useModalState = () => {
  const [mounted, setMounted] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [commentsExpanded, setCommentsExpanded] = useState(false)

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return {
    mounted,
    selectedPhoto,
    commentsExpanded,
    setSelectedPhoto,
    setCommentsExpanded
  }
}

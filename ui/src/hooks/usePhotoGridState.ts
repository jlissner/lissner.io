import { useState } from 'react'
import { Photo, PhotoGroup } from '../components/utils/photoUtils'
import { togglePhotoInSet } from '../utils/photoGridStateUtils'

export function usePhotoGridState() {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<PhotoGroup | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  const toggleComments = (photoId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedComments(prev => togglePhotoInSet(photoId, prev))
  }

  return {
    selectedPhoto,
    selectedGroup,
    expandedComments,
    setSelectedPhoto,
    setSelectedGroup,
    setExpandedComments,
    toggleComments
  }
}

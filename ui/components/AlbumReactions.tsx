'use client'

import { useState, useEffect } from 'react'
import { EmojiPicker } from './EmojiPicker'

interface Reaction {
  id: string
  type: string
  author: string
  createdAt: string
}

interface AlbumActionsHook {
  localReactions: Reaction[]
  userReactions: Reaction[]
  handleReaction: (type: string) => void
}

interface AlbumReactionsProps {
  albumActions: AlbumActionsHook
}

export const AlbumReactions = ({ albumActions }: AlbumReactionsProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker) {
        const target = event.target as Element
        if (!target.closest('.emoji-picker-container')) {
          setShowEmojiPicker(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4 pb-6">
      <div className="flex items-center space-x-2 flex-wrap">
        {/* Show existing album reactions grouped by emoji */}
        {Object.entries(
          albumActions.localReactions.reduce((acc, reaction) => {
            acc[reaction.type] = (acc[reaction.type] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ).map(([emoji, count]) => {
          const isUserReaction = albumActions.userReactions.some(r => r.type === emoji)
          return (
            <button
              key={emoji}
              onClick={() => albumActions.handleReaction(emoji)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                isUserReaction
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          )
        })}
        
        {/* Add reaction button - right next to existing reactions */}
        <div className="relative emoji-picker-container">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors hover:bg-gray-200 text-gray-600 border border-gray-200"
            title="Add reaction"
          >
            <span>😊</span>
            <span>+</span>
          </button>
          
          {/* Emoji Picker - Positioned absolutely to not affect layout */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <EmojiPicker
                onEmojiSelect={(emoji) => albumActions.handleReaction(emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>
      
      {albumActions.localReactions.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">No reactions yet. Be the first to react to this album!</p>
      )}
    </div>
  )
}

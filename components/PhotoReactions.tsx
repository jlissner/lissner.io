'use client'

import { useState, useEffect } from 'react'
import { EmojiPicker } from './EmojiPicker'

interface Reaction {
  id: string
  type: string // Changed to support any emoji
  author: string
  createdAt: string
}

interface PhotoReactionsProps {
  reactions: Reaction[]
  userReactions: Reaction[]
  onReaction: (type: string) => void
}

export const PhotoReactions = ({
  reactions,
  userReactions,
  onReaction
}: PhotoReactionsProps) => {
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

  // Group reactions by emoji type
  const reactionCounts = reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="mb-4">
      <h4 className="font-medium text-gray-900 mb-2">Reactions</h4>
      <div className="flex items-center flex-wrap gap-2 mb-2">
        {/* Show existing reactions grouped by emoji */}
        {Object.entries(reactionCounts).map(([emoji, count]) => {
          const isUserReaction = userReactions.some(r => r.type === emoji)
          return (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm transition-colors ${
                isUserReaction
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'hover:bg-gray-200 text-gray-600 border border-gray-200'
              }`}
            >
              <span className="text-lg">{emoji}</span>
              <span>{count}</span>
            </button>
          )
        })}
        
        {/* Add reaction button */}
        <div className="relative emoji-picker-container">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-sm transition-colors hover:bg-gray-200 text-gray-600 border border-gray-200"
            title="Add reaction"
          >
            <span className="text-lg">😊</span>
            <span>+</span>
          </button>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <EmojiPicker
              onEmojiSelect={(emoji) => onReaction(emoji)}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      </div>
      
      {reactions.length > 0 && (
        <p className="text-sm text-gray-600">
          {reactions.length} reaction{reactions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
} 
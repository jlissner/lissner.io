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
    <div style={{ marginBottom: '1rem' }}>
      <h4 style={{ 
        fontWeight: 500, 
        color: 'rgba(255, 255, 255, 0.9)', 
        marginBottom: '0.5rem' 
      }}>
        Reactions
      </h4>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '0.5rem', 
        marginBottom: '0.5rem' 
      }}>
        {/* Show existing reactions grouped by emoji */}
        {Object.entries(reactionCounts).map(([emoji, count]) => {
          const isUserReaction = userReactions.some(r => r.type === emoji)
          return (
            <button
              key={emoji}
              onClick={() => onReaction(emoji)}
              data-size="sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.875rem',
                background: isUserReaction ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: isUserReaction ? 'var(--primary-400)' : 'rgba(255, 255, 255, 0.8)',
                border: `1px solid ${isUserReaction ? 'var(--primary-400)' : 'rgba(255, 255, 255, 0.2)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{emoji}</span>
              <span>{count}</span>
            </button>
          )
        })}
        
        {/* Add reaction button */}
        <div style={{ position: 'relative' }} className="emoji-picker-container">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            data-size="sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '1rem',
              fontSize: '0.875rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Add reaction"
          >
            <span style={{ fontSize: '1.125rem' }}>😊</span>
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
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'rgba(255, 255, 255, 0.6)' 
        }}>
          {reactions.length} reaction{reactions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
} 
'use client'

import { PlusIcon } from '@heroicons/react/24/outline'
import { EmojiPicker } from '../EmojiPicker'
import { 
  processReactionsForDisplay, 
  getReactionButtonClasses,
  type Reaction 
} from '../../utils/albumReactionUtils'

interface AlbumReactionSummaryProps {
  reactions: Reaction[]
  userReactions: Reaction[]
  showEmojiPicker: boolean
  isUpdatingReaction: boolean
  canReact: boolean
  commentCount: number
  onReactionClick: (emoji: string, e: React.MouseEvent) => void
  onToggleEmojiPicker: (e: React.MouseEvent) => void
  onEmojiSelect: (emoji: string) => void
  onCloseEmojiPicker: () => void
}

export const AlbumReactionSummary = ({
  reactions,
  userReactions,
  showEmojiPicker,
  isUpdatingReaction,
  canReact,
  commentCount,
  onReactionClick,
  onToggleEmojiPicker,
  onEmojiSelect,
  onCloseEmojiPicker
}: AlbumReactionSummaryProps) => {
  // Process reactions for display using utility function
  const processedReactions = processReactionsForDisplay(reactions, userReactions)

  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-1">
        {/* Show existing reactions */}
        {processedReactions.map(({ emoji, count, hasUserReacted }) => (
          <button
            key={emoji}
            onClick={(e) => onReactionClick(emoji, e)}
            disabled={isUpdatingReaction || !canReact}
            className={getReactionButtonClasses(hasUserReacted, isUpdatingReaction, canReact)}
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{count}</span>
          </button>
        ))}
        
        {/* Show placeholder if no reactions */}
        {processedReactions.length === 0 && (
          <span className="flex items-center space-x-1 text-gray-400 text-xs">
            No reactions yet
          </span>
        )}
        
        {/* Add reaction button */}
        {canReact && (
          <div className="relative">
            <button
              onClick={onToggleEmojiPicker}
              disabled={isUpdatingReaction}
              className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              title="Add reaction"
            >
              <PlusIcon className="w-4 h-4 text-gray-600" />
            </button>
            
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={onEmojiSelect}
                onClose={onCloseEmojiPicker}
              />
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        <span>💬</span>
        <span>{commentCount}</span>
      </div>
    </div>
  )
}

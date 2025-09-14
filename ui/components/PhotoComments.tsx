'use client'

import { TrashIcon } from '@heroicons/react/24/outline'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'
import { useAuth } from '@/ui/lib/auth-context'

interface Comment {
  id: string
  content: string
  author: string
  createdAt: string
}

interface PhotoCommentsProps {
  comments: Comment[]
  newComment: string
  isLoading: boolean
  onNewCommentChange: (value: string) => void
  onAddComment: (e: React.FormEvent) => void
  onDeleteComment: (commentId: string) => void
}

export const PhotoComments = ({
  comments,
  newComment,
  isLoading,
  onNewCommentChange,
  onAddComment,
  onDeleteComment
}: PhotoCommentsProps) => {
  const { user } = useAuth()

  return (
    <div className="h-full flex flex-col">
      <h4 className="font-medium text-gray-900 mb-3">
        Comments ({comments.length})
      </h4>
      
      {/* Add Comment Form */}
      <form onSubmit={onAddComment} className="mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full ${getUserColor(user?.email || '')} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
            {getUserInitials(user?.email || '')}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 bg-white"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full ${getUserColor(comment.author)} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                {getUserInitials(comment.author)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-gray-900">
                        {getDisplayName(comment.author)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    {/* Delete button - only show for own comments or if admin */}
                    {(comment.author === user?.email || user?.isAdmin) && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                        title="Delete comment"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 break-words">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 text-sm py-8">
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  )
} 
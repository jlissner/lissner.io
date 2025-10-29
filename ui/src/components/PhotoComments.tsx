'use client'

import { TrashIcon } from '@heroicons/react/24/outline'
import { getUserColor, getUserInitials, getDisplayName, getRelativeTime } from './utils/photoUtils'
import { useAuth } from '../lib/auth-context'

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ 
        fontWeight: 500, 
        color: 'rgba(255, 255, 255, 0.9)', 
        marginBottom: '0.75rem' 
      }}>
        Comments ({comments.length})
      </h4>
      
      {/* Add Comment Form */}
      <form onSubmit={onAddComment} style={{ marginBottom: '1rem' }}>
        <div data-cluster="md">
          <div data-avatar="sm" className={getUserColor(user?.email || '')}>
            {getUserInitials(user?.email || '')}
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => onNewCommentChange(e.target.value)}
              placeholder="Add a comment..."
              disabled={isLoading}
              style={{ 
                fontSize: '0.875rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.9)',
                width: '100%'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || isLoading}
            data-size="sm"
            style={{
              background: !newComment.trim() || isLoading ? 'rgba(59, 130, 246, 0.3)' : 'var(--primary-500)',
              cursor: !newComment.trim() || isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div data-stack="md" style={{ flex: 1, overflowY: 'auto' }}>
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} data-cluster="md" style={{ alignItems: 'flex-start' }}>
              <div data-avatar="sm" className={getUserColor(comment.author)}>
                {getUserInitials(comment.author)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '0.75rem', 
                  padding: '0.75rem', 
                  border: '1px solid rgba(255, 255, 255, 0.1)' 
                }}>
                  <div data-flex="between" style={{ marginBottom: '0.25rem' }}>
                    <div data-cluster="sm">
                      <span style={{ 
                        fontWeight: 500, 
                        fontSize: '0.875rem', 
                        color: 'rgba(255, 255, 255, 0.9)' 
                      }}>
                        {getDisplayName(comment.author)}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: 'rgba(255, 255, 255, 0.6)' 
                      }}>
                        {getRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                    {/* Delete button - only show for own comments or if admin */}
                    {(comment.author === user?.email || user?.isAdmin) && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        style={{ 
                          color: 'rgba(255, 255, 255, 0.4)',
                          padding: '0.25rem',
                          borderRadius: '0.25rem'
                        }}
                        title="Delete comment"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    wordBreak: 'break-words' 
                  }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '0.875rem', 
            padding: '2rem 0' 
          }}>
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
    </div>
  )
} 
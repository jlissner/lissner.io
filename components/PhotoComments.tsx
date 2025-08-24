'use client'

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
}

export const PhotoComments = ({
  comments,
  newComment,
  isLoading,
  onNewCommentChange,
  onAddComment
}: PhotoCommentsProps) => {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">
        Comments ({comments.length})
      </h4>
      
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <div className="font-medium text-gray-900">{comment.author}</div>
            <div className="text-gray-800">{comment.content}</div>
            <div className="text-gray-500 text-xs">
              {new Date(comment.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={onAddComment}>
        <div className="flex">
          <input
            type="text"
            value={newComment}
            onChange={(e) => onNewCommentChange(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isLoading}
            className="px-3 py-1 bg-primary-600 text-white text-sm rounded-r hover:bg-primary-700 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  )
} 
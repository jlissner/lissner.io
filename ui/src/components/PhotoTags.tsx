'use client'

import { XMarkIcon } from '@heroicons/react/24/outline'

interface PhotoTagsProps {
  tags: string[]
  newTag: string
  onNewTagChange: (value: string) => void
  onAddTag: (e: React.FormEvent) => void
  onRemoveTag: (tag: string) => void
}

export const PhotoTags = ({
  tags,
  newTag,
  onNewTagChange,
  onAddTag,
  onRemoveTag
}: PhotoTagsProps) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h4 style={{ 
        fontWeight: 500, 
        color: 'rgba(255, 255, 255, 0.9)', 
        marginBottom: '0.5rem' 
      }}>
        Tags
      </h4>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.25rem', 
        marginBottom: '0.5rem' 
      }}>
        {tags.map((tag, index) => (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s ease'
            }}
            className="group"
          >
            #{tag}
            <button
              onClick={() => onRemoveTag(tag)}
              style={{
                marginLeft: '0.25rem',
                color: 'rgba(255, 255, 255, 0.4)',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              className="group-hover:opacity-100 hover:!text-red-400"
              title="Remove tag"
            >
              <XMarkIcon style={{ width: '0.75rem', height: '0.75rem' }} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={onAddTag} style={{ display: 'flex' }}>
        <input
          type="text"
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          placeholder="Add a tag..."
          style={{
            flex: 1,
            fontSize: '0.875rem',
            padding: '0.5rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.5rem 0 0 0.5rem',
            color: 'rgba(255, 255, 255, 0.9)'
          }}
        />
        <button
          type="submit"
          disabled={!newTag.trim()}
          style={{
            padding: '0.5rem 0.75rem',
            background: !newTag.trim() ? 'rgba(59, 130, 246, 0.3)' : 'var(--primary-500)',
            color: 'white',
            fontSize: '0.875rem',
            borderRadius: '0 0.5rem 0.5rem 0',
            border: 'none',
            cursor: !newTag.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Add
        </button>
      </form>
    </div>
  )
} 
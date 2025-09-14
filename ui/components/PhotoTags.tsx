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
    <div className="mb-4">
      <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full group hover:bg-gray-200 transition-colors"
          >
            #{tag}
            <button
              onClick={() => onRemoveTag(tag)}
              className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove tag"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={onAddTag} className="flex">
        <input
          type="text"
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          placeholder="Add a tag..."
          className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white text-gray-900 placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={!newTag.trim()}
          className="px-3 py-1 bg-primary-600 text-white text-sm rounded-r hover:bg-primary-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  )
} 
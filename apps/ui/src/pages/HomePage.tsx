import { useEffect, useState, useRef } from "react";
import { filesApi } from "../api/files";
import { getUserById } from "../api/users";
import type { File, FileWithMetadata, Comment, Tag, User } from "@lissner/types";

function isImageFile(type: string): boolean {
  return type.startsWith("image/");
}

const FilePreview: React.FC<{ file: File }> = ({ file }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreviewUrl = async () => {
      try {
        const url = await filesApi.getFileUrl(file.file_id, file.name);
        setPreviewUrl(url);
      } catch (err) {
        console.error('Error fetching preview URL:', err);
        setError('Failed to load preview');
      }
    };

    fetchPreviewUrl();
  }, [file]);

  if (error) {
    return (
      <div className="flex items-center justify-center bg-grey p-sm rounded">
        <span className="text-xs text-grey-dark">{error}</span>
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="flex items-center justify-center bg-grey p-sm rounded">
        <span className="text-xs text-grey-dark">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center bg-grey p-sm rounded">
      <img
        src={previewUrl}
        alt={file.name}
        className="w-full h-auto"
        style={{ maxWidth: '150px' }}
      />
    </div>
  );
};

const CommentList: React.FC<{ 
  comments: Comment[]; 
  userNames: Record<string, string>;
  onDeleteComment: (commentId: string) => void;
  currentUserId: string;
}> = ({ comments, userNames, onDeleteComment, currentUserId }) => {
  return (
    <div className="mt-md">
      <h3 className="text-md font-medium mb-sm">Comments</h3>
      {comments.length === 0 ? (
        <p className="text-sm text-grey">No comments yet</p>
      ) : (
        <div className="space-y-sm">
          {comments.map(comment => (
            <div key={comment.id} className="bg-grey p-sm rounded">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium">{userNames[comment.user_id] || comment.user_id}</span>
                  <p className="text-sm mt-xxs">{comment.content}</p>
                  <span className="text-xs text-grey">{new Date(comment.created_at).toLocaleString()}</span>
                </div>
                {comment.user_id === currentUserId && (
                  <button 
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-xs text-red hover:text-red-alt"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TagList: React.FC<{ 
  tags: Tag[]; 
  onDeleteTag: (tagId: string) => void;
  currentUserId: string;
  fileOwnerId: string;
}> = ({ tags, onDeleteTag, currentUserId, fileOwnerId }) => {
  return (
    <div className="mt-md">
      <h3 className="text-md font-medium mb-sm">Tags</h3>
      {tags.length === 0 ? (
        <p className="text-sm text-grey">No tags yet</p>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {tags.map(tag => (
            <div key={tag.id} className="bg-blue p-xxs rounded flex items-center">
              <span className="text-xs text-white">{tag.name}</span>
              {currentUserId === fileOwnerId && (
                <button 
                  onClick={() => onDeleteTag(tag.id)}
                  className="text-xs text-white ml-xs hover:text-red-alt"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddComment: React.FC<{ 
  fileId: string; 
  onCommentAdded: (comment: Comment) => void;
}> = ({ fileId, onCommentAdded }) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      const comment = await filesApi.addComment({
        file_id: fileId,
        content: content.trim(),
      });
      onCommentAdded(comment);
      setContent("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-md">
      <div className="flex gap-sm">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-grow p-sm rounded border"
          disabled={isSubmitting}
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
};

const AddTag: React.FC<{ 
  fileId: string; 
  onTagAdded: (tag: Tag) => void;
}> = ({ fileId, onTagAdded }) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const tag = await filesApi.addTag({
        file_id: fileId,
        name: name.trim(),
      });
      onTagAdded(tag);
      setName("");
    } catch (error) {
      console.error("Error adding tag:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-sm">
      <div className="flex gap-sm">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a tag..."
          className="flex-grow p-sm rounded border"
          disabled={isSubmitting}
        />
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
};

const FileCard: React.FC<{ 
  file: FileWithMetadata; 
  userNames: Record<string, string>;
  currentUserId: string;
  onDeleteFile: (fileId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteTag: (tagId: string) => void;
  onCommentAdded: (fileId: string, comment: Comment) => void;
  onTagAdded: (fileId: string, tag: Tag) => void;
}> = ({ 
  file, 
  userNames, 
  currentUserId, 
  onDeleteFile, 
  onDeleteComment, 
  onDeleteTag,
  onCommentAdded,
  onTagAdded
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCommentAdded = (comment: Comment) => {
    onCommentAdded(file.file_id, comment);
  };

  const handleTagAdded = (tag: Tag) => {
    onTagAdded(file.file_id, tag);
  };

  return (
    <div className="bg-white p-md rounded shadow-sm">
      <div className="flex justify-between items-start mb-sm">
        <div>
          <h3 className="text-md font-medium">{file.name}</h3>
          <p className="text-sm text-grey">
            Posted by {userNames[file.owner_id] || file.owner_id} on {new Date(file.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        {currentUserId === file.owner_id && (
          <button 
            onClick={() => onDeleteFile(file.file_id)}
            className="text-xs text-red hover:text-red-alt"
          >
            Delete
          </button>
        )}
      </div>

      <div className="flex justify-center mb-md">
        <FilePreview file={file} />
      </div>

      <TagList 
        tags={file.tags || []} 
        onDeleteTag={onDeleteTag}
        currentUserId={currentUserId}
        fileOwnerId={file.owner_id}
      />

      <AddTag fileId={file.file_id} onTagAdded={handleTagAdded} />

      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-blue mt-md hover:text-blue-alt"
      >
        {isExpanded ? "Hide Comments" : "Show Comments"}
      </button>

      {isExpanded && (
        <>
          <CommentList 
            comments={file.comments || []} 
            userNames={userNames}
            onDeleteComment={onDeleteComment}
            currentUserId={currentUserId}
          />
          <AddComment fileId={file.file_id} onCommentAdded={handleCommentAdded} />
        </>
      )}
    </div>
  );
};

export function HomePage() {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await getUserById("current"); // This should be replaced with the actual current user ID
      setCurrentUser(user);
    } catch (err) {
      console.error("Error loading current user:", err);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await filesApi.getFiles();
      
      // Fetch detailed file information with comments and tags
      const filesWithMetadata = await Promise.all(
        data.map(async (file) => {
          try {
            return await filesApi.getFile(file.file_id);
          } catch (err) {
            console.error(`Error fetching file ${file.file_id}:`, err);
            return file;
          }
        })
      );
      
      setFiles(filesWithMetadata);
      
      // Fetch user names for all unique user IDs
      const uniqueUserIds = new Set<string>();
      filesWithMetadata.forEach((file: FileWithMetadata) => {
        uniqueUserIds.add(file.owner_id);
        (file.comments || []).forEach((comment: Comment) => {
          uniqueUserIds.add(comment.user_id);
        });
      });
      
      const userNamesMap: Record<string, string> = {};
      
      await Promise.all(
        Array.from(uniqueUserIds).map(async (userId) => {
          try {
            const user = await getUserById(userId);
            userNamesMap[userId] = user.name || user.email;
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
            userNamesMap[userId] = userId; // Fallback to ID if user fetch fails
          }
        })
      );
      
      setUserNames(userNamesMap);
    } catch (err) {
      console.error("Error loading files:", err);
      if (err instanceof Error) {
        setError(`Failed to load files: ${err.message}`);
      } else {
        setError("Failed to load files");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await filesApi.deleteFile(fileId);
      setFiles(files.filter((f) => f.file_id !== fileId));
    } catch (err) {
      console.error("Error deleting file:", err);
      if (err instanceof Error) {
        setError(`Failed to delete file: ${err.message}`);
      } else {
        setError("Failed to delete file");
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await filesApi.deleteComment(commentId);
      setFiles(files.map(file => ({
        ...file,
        comments: (file.comments || []).filter(c => c.id !== commentId)
      })));
    } catch (err) {
      console.error("Error deleting comment:", err);
      if (err instanceof Error) {
        setError(`Failed to delete comment: ${err.message}`);
      } else {
        setError("Failed to delete comment");
      }
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      await filesApi.deleteTag(tagId);
      setFiles(files.map(file => ({
        ...file,
        tags: (file.tags || []).filter(t => t.id !== tagId)
      })));
    } catch (err) {
      console.error("Error deleting tag:", err);
      if (err instanceof Error) {
        setError(`Failed to delete tag: ${err.message}`);
      } else {
        setError("Failed to delete tag");
      }
    }
  };

  const handleCommentAdded = (fileId: string, comment: Comment) => {
    setFiles(files.map(file => {
      if (file.file_id === fileId) {
        return {
          ...file,
          comments: [...(file.comments || []), comment]
        };
      }
      return file;
    }));
  };

  const handleTagAdded = (fileId: string, tag: Tag) => {
    setFiles(files.map(file => {
      if (file.file_id === fileId) {
        return {
          ...file,
          tags: [...(file.tags || []), tag]
        };
      }
      return file;
    }));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Get signed URL from backend
      const { uploadUrl, file: fileRecord } = await filesApi.uploadFile(
        file.name,
        file.type
      );

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
      }

      // Fetch the complete file with metadata
      const fileWithMetadata = await filesApi.getFile(fileRecord.file_id);
      
      // Update user names if needed
      if (!userNames[fileWithMetadata.owner_id]) {
        try {
          const user = await getUserById(fileWithMetadata.owner_id);
          setUserNames(prev => ({
            ...prev,
            [fileWithMetadata.owner_id]: user.name || user.email
          }));
        } catch (err) {
          console.error(`Error fetching user ${fileWithMetadata.owner_id}:`, err);
        }
      }

      setFiles([fileWithMetadata, ...files]);
    } catch (err) {
      console.error("Error uploading file:", err);
      if (err instanceof Error) {
        setError(`Failed to upload file: ${err.message}`);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="p-lg">
      <div className="flex justify-between items-center mb-lg">
        <h1 className="text-2xl font-bold" style={{ color: "var(--grey-dark)" }}>
          Picture Feed
        </h1>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={handleUploadClick}
            className="btn btn-primary"
          >
            Upload Picture
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-lg">
          <p className="text-lg text-grey">No pictures yet. Upload one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {files.map((file) => (
            <FileCard
              key={file.file_id}
              file={file}
              userNames={userNames}
              currentUserId={currentUser?.id || ""}
              onDeleteFile={handleDeleteFile}
              onDeleteComment={handleDeleteComment}
              onDeleteTag={handleDeleteTag}
              onCommentAdded={handleCommentAdded}
              onTagAdded={handleTagAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

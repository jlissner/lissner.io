import { useEffect, useState, useRef } from "react";
import { filesApi } from "../api/files";
import { getUserById } from "../api/users";
import type { File, User } from "@lissner/types";

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

export function FilesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      console.log("Fetching files...");
      const data = await filesApi.getFiles();
      console.log("Received files:", data);
      setFiles(data);
      
      // Fetch user names for all unique owner IDs
      const uniqueOwnerIds = [...new Set(data.map(file => file.owner_id))];
      const userNamesMap: Record<string, string> = {};
      
      await Promise.all(
        uniqueOwnerIds.map(async (ownerId) => {
          try {
            const user = await getUserById(ownerId);
            userNamesMap[ownerId] = user.name || user.email;
          } catch (err) {
            console.error(`Error fetching user ${ownerId}:`, err);
            userNamesMap[ownerId] = ownerId; // Fallback to ID if user fetch fails
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

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      console.log("Starting file deletion:", fileId);
      await filesApi.deleteFile(fileId);
      console.log("File deleted successfully, updating UI");
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      console.log("Starting file upload:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Get signed URL from backend
      const { uploadUrl, file: fileRecord } = await filesApi.uploadFile(
        file.name,
        file.type
      );
      console.log("Got signed URL:", uploadUrl);

      // Upload file to S3
      console.log("Uploading to S3...");
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("S3 upload failed:", {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText,
          url: uploadUrl,
        });
        throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
      }

      console.log("File uploaded successfully");
      setFiles([...files, fileRecord]);
    } catch (err) {
      console.error("Error uploading file:", err);
      if (err instanceof Error) {
        setError(`Failed to upload file: ${err.message}`);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Group files by owner_id
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.owner_id]) {
      acc[file.owner_id] = [];
    }
    acc[file.owner_id].push(file);
    return acc;
  }, {} as Record<string, File[]>);

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--grey-dark)" }}>
          Files
        </h1>
        <div className="flex items-center space-x-4">
          {uploading && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload File
          </button>
        </div>
      </div>

      {Object.entries(groupedFiles).map(([ownerId, ownerFiles]) => (
        <div key={ownerId} className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--grey-dark)" }}>
            Owner: {userNames[ownerId] || ownerId}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {ownerFiles.map((file) => (
              <div
                key={file.file_id}
                className="bg-white p-2 rounded-lg border border-gray-200 flex flex-col"
              >
                <div className="flex justify-center mb-2">
                  <FilePreview file={file} />
                </div>
                <div className="flex flex-col flex-grow">
                  <div className="font-medium text-sm truncate" style={{ color: "var(--grey-dark)" }}>
                    {file.name}
                  </div>
                  <div className="text-sm mt-1" style={{ color: "var(--grey)" }}>
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm" style={{ color: "var(--grey)" }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => handleDelete(file.file_id)}
                      className="text-red-500 hover:text-red-600 text-sm w-full text-center"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 
import type { 
  File, 
  FileWithMetadata, 
  Comment, 
  Tag, 
  CreateCommentData, 
  CreateTagData 
} from "@lissner/types";
import { afetch } from "./utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const FILES_API = `${API_URL}/files`;

export const filesApi = {
  async getFiles(): Promise<File[]> {
    const response = await afetch(FILES_API);
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }
    return response.json();
  },

  async getFile(fileId: string): Promise<FileWithMetadata> {
    const response = await afetch(`${FILES_API}/${fileId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return response.json();
  },

  async getFileUrl(fileId: string, fileName: string): Promise<string> {
    const response = await afetch(`${FILES_API}/${fileId}/url`);
    if (!response.ok) {
      throw new Error(`Failed to get file URL: ${response.statusText}`);
    }
    const data = await response.json();
    return data.url;
  },

  async uploadFile(fileName: string, fileType: string): Promise<{ uploadUrl: string; file: File }> {
    const response = await afetch(`${FILES_API}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: fileName, type: fileType }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get upload URL: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteFile(fileId: string): Promise<void> {
    const response = await afetch(`${FILES_API}/${fileId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  },

  async addComment(data: CreateCommentData): Promise<Comment> {
    const response = await afetch(`${FILES_API}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteComment(commentId: string): Promise<void> {
    const response = await afetch(`${FILES_API}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Failed to delete comment: ${response.statusText}`);
    }
  },

  async addTag(data: CreateTagData): Promise<Tag> {
    const response = await afetch(`${FILES_API}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to add tag: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteTag(tagId: string): Promise<void> {
    const response = await afetch(`${FILES_API}/tags/${tagId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Failed to delete tag: ${response.statusText}`);
    }
  },
}; 
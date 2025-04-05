import { Router, Request, Response } from "express";
import { z } from "zod";
import { dynamodb } from "../aws/dynamodb";
import { s3 } from "../aws/s3";
import { v4 as uuidv4 } from "uuid";
import type { CreateCommentData, CreateTagData, File, FileWithMetadata } from "@lissner/types";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const filesRouter = Router();

// Validation schemas
const createFileSchema = z.object({
  name: z.string(),
  type: z.string(),
}) as z.ZodType<{ name: string; type: string }>;

const createCommentSchema = z.object({
  file_id: z.string(),
  content: z.string(),
}) as z.ZodType<CreateCommentData>;

const createTagSchema = z.object({
  file_id: z.string(),
  name: z.string(),
}) as z.ZodType<CreateTagData>;

// Get all files
filesRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const files = await dynamodb.scanFiles();
    res.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// Get file by ID with comments and tags
filesRouter.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  console.log("=== START: GET /:id endpoint ===");
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log("Unauthorized: No user ID found in request");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    console.log(`Authenticated user ID: ${userId}`);

    const fileId = req.params.id;
    console.log(`Fetching file with ID: ${fileId}`);
    
    console.log("Step 1: Calling dynamodb.getFileById");
    const file = await dynamodb.getFileById(fileId);
    
    if (!file) {
      console.log(`File not found with ID: ${fileId}`);
      res.status(404).json({ error: "File not found" });
      return;
    }

    console.log(`File found: ${JSON.stringify(file)}`);

    // Get comments and tags for the file
    console.log("Step 2: Getting comments from file");
    const comments = (file as any).comments || [];
    console.log(`Found ${comments.length} comments`);

    console.log("Step 3: Getting tags from file");
    const tags = (file as any).tags || [];
    console.log(`Found ${tags.length} tags`);

    console.log(`Step 4: Calling dynamodb.getUserById with owner_id: ${file.owner_id}`);
    const user = await dynamodb.getUserById(file.owner_id);
    console.log(`User found: ${user ? 'yes' : 'no'}`);

    console.log("Step 5: Constructing fileWithMetadata");
    const fileWithMetadata: FileWithMetadata = {
      ...file,
      comments,
      tags,
      user: user || undefined,
    };

    console.log("Step 6: Sending response");
    res.json(fileWithMetadata);
    console.log("=== END: GET /:id endpoint ===");
  } catch (error) {
    console.error("Error fetching file:", error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}`);
      if (error.stack) {
        console.error(`Stack trace: ${error.stack}`);
      }
    }
    console.log("=== END: GET /:id endpoint (with error) ===");
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// Get file URL
filesRouter.get("/:id/url", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fileId = req.params.id;
    
    const file = await dynamodb.getFileById(fileId);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Extract extension from the file name
    const extension = file.name.split('.').pop() || "";
    
    // Construct the S3 key with the correct extension
    const s3Key = `${file.owner_id}/${fileId}${extension ? `.${extension}` : ''}`;
    console.log("Generating URL for S3 key:", s3Key);
    
    try {
      const url = await s3.generateDownloadUrl(s3Key);
      res.json({ url });
    } catch (error) {
      console.error("Error generating S3 URL:", error);
      // Try without extension if the first attempt fails
      const fallbackKey = `${file.owner_id}/${fileId}`;
      console.log("Trying fallback key:", fallbackKey);
      const url = await s3.generateDownloadUrl(fallbackKey);
      res.json({ url });
    }
  } catch (error) {
    console.error("Error generating file URL:", error);
    res.status(500).json({ error: "Failed to generate file URL" });
  }
});

// Upload file
filesRouter.post("/upload", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, type } = createFileSchema.parse(req.body);
    const fileId = uuidv4();
    
    // Get file extension from the name
    const extension = name.split('.').pop() || '';
    const s3Key = `${userId}/${fileId}${extension ? `.${extension}` : ''}`;
    
    const uploadUrl = await s3.generateUploadUrl(s3Key, type);
    
    const file: File = {
      owner_id: userId,
      file_id: fileId,
      name,
      size: 0, // Will be updated after upload
      type,
      uploaded_at: new Date().toISOString(),
    };
    
    await dynamodb.createFile(file);
    
    res.json({ uploadUrl, file });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Delete file
filesRouter.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const fileId = req.params.id;
    const file = await dynamodb.getFileById(fileId);
    
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    
    if (file.owner_id !== userId) {
      res.status(403).json({ error: "Not authorized to delete this file" });
      return;
    }
    
    await s3.deleteFile(`${file.owner_id}/${fileId}`);
    await dynamodb.deleteFile(fileId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Add comment to file
filesRouter.post("/comments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { file_id, content } = createCommentSchema.parse(req.body);
    
    // Check if file exists
    const file = await dynamodb.getFileById(file_id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    
    // Create the comment object
    const comment = {
      id: uuidv4(),
      file_id,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
    };
    
    // Add the comment to the file
    const updatedComment = await dynamodb.createComment(comment);
    
    res.status(201).json(updatedComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Delete comment
filesRouter.delete("/comments/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const commentId = req.params.id;
    const comment = await dynamodb.getCommentById(commentId);
    
    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }
    
    if (comment.user_id !== userId) {
      res.status(403).json({ error: "Not authorized to delete this comment" });
      return;
    }
    
    await dynamodb.deleteComment(commentId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Add tag to file
filesRouter.post("/tags", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { file_id, name } = createTagSchema.parse(req.body);
    
    // Check if file exists
    const file = await dynamodb.getFileById(file_id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    
    // Create the tag object
    const tag = {
      id: uuidv4(),
      file_id,
      name,
      created_at: new Date().toISOString(),
    };
    
    // Add the tag to the file
    const updatedTag = await dynamodb.createTag(tag);
    
    res.status(201).json(updatedTag);
  } catch (error) {
    console.error("Error adding tag:", error);
    res.status(500).json({ error: "Failed to add tag" });
  }
});

// Delete tag
filesRouter.delete("/tags/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const tagId = req.params.id;
    const tag = await dynamodb.getTagById(tagId);
    
    if (!tag) {
      res.status(404).json({ error: "Tag not found" });
      return;
    }
    
    // Check if user owns the file
    const file = await dynamodb.getFileById(tag.file_id);
    if (!file || file.owner_id !== userId) {
      res.status(403).json({ error: "Not authorized to delete this tag" });
      return;
    }
    
    await dynamodb.deleteTag(tagId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
}); 
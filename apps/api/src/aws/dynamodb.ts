import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { CreateUserData, PaginatedUsers, UpdateUserData, User, File, Comment, Tag } from "@lissner/types";

const client = new DynamoDBClient({
  region: "us-west-2",
});

const docClient = DynamoDBDocumentClient.from(client);

export const dynamodb = {
  async scanUsers(
    limit: number = 10,
    lastEvaluatedKey?: Record<string, any>,
  ): Promise<PaginatedUsers> {
    const command = new ScanCommand({
      TableName: "LissnerUsers",
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    try {
      const response = await docClient.send(command);
      return {
        users: (response.Items || []) as User[],
        lastEvaluatedKey: response.LastEvaluatedKey ? JSON.stringify(response.LastEvaluatedKey) : undefined,
      };
    } catch (error) {
      console.error("Error scanning users:", error);
      throw error;
    }
  },

  async getUserById(userId: string): Promise<User | null> {
    console.log(`Getting user by ID: ${userId}`);
    
    const command = new GetCommand({
      TableName: "LissnerUsers",
      Key: {
        id: userId,
      },
    });

    try {
      console.log("Sending GetCommand to DynamoDB for user");
      const response = await docClient.send(command);
      console.log(`GetCommand response for user: ${JSON.stringify(response)}`);
      
      if (response.Item) {
        console.log(`User found: ${JSON.stringify(response.Item)}`);
        return response.Item as User;
      } else {
        console.log(`No user found with ID: ${userId}`);
        return null;
      }
    } catch (error) {
      console.error("Error getting user by ID:", error);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        if (error.stack) {
          console.error(`Stack trace: ${error.stack}`);
        }
      }
      throw error;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const command = new ScanCommand({
      TableName: "LissnerUsers",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    });

    try {
      const response = await docClient.send(command);
      return (response.Items?.[0] as User) || null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  },

  async createUser(user: CreateUserData): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(), // Generate a unique ID
    };

    const command = new PutCommand({
      TableName: "LissnerUsers",
      Item: newUser,
      ConditionExpression: "attribute_not_exists(id)", // Prevent duplicate IDs
    });

    try {
      await docClient.send(command);
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  async updateUser(
    userId: string,
    updates: UpdateUserData,
  ): Promise<User | null> {
    console.log("DynamoDB updateUser called with:", { userId, updates });
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`SET #${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      } else {
        updateExpressions.push(`REMOVE #${key}`);
        expressionAttributeNames[`#${key}`] = key;
      }
    });

    const command = new UpdateCommand({
      TableName: "LissnerUsers",
      Key: {
        id: userId,
      },
      UpdateExpression: updateExpressions.join(" "),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    console.log("DynamoDB UpdateCommand:", {
      TableName: command.input.TableName,
      Key: command.input.Key,
      UpdateExpression: command.input.UpdateExpression,
      ExpressionAttributeNames: command.input.ExpressionAttributeNames,
      ExpressionAttributeValues: command.input.ExpressionAttributeValues,
    });

    try {
      const response = await docClient.send(command);
      console.log("DynamoDB update response:", response);
      return response.Attributes as User;
    } catch (error) {
      console.error("DynamoDB update error:", error);
      throw error;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: "LissnerUsers",
      Key: {
        id: userId,
      },
      ReturnValues: "ALL_OLD",
    });

    try {
      const response = await docClient.send(command);
      return !!response.Attributes;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  async getFilesByOwner(ownerId: string): Promise<File[]> {
    const command = new ScanCommand({
      TableName: "LissnerFiles",
      FilterExpression: "owner_id = :ownerId",
      ExpressionAttributeValues: {
        ":ownerId": ownerId,
      },
    });

    try {
      const response = await docClient.send(command);
      return (response.Items || []) as File[];
    } catch (error) {
      console.error("Error getting files by owner:", error);
      throw error;
    }
  },

  async scanFiles(): Promise<File[]> {
    const command = new ScanCommand({
      TableName: "LissnerFiles",
    });

    try {
      const response = await docClient.send(command);
      return (response.Items || []) as File[];
    } catch (error) {
      console.error("Error scanning files:", error);
      throw error;
    }
  },

  async getFileById(fileId: string): Promise<File | null> {
    // Remove any file extension from the file ID
    const cleanFileId = fileId.split('.')[0];
    console.log(`Getting file by ID: ${fileId}, cleaned ID: ${cleanFileId}`);
    
    // We need to scan the table since we don't have the owner_id
    const command = new ScanCommand({
      TableName: "LissnerFiles",
      FilterExpression: "file_id = :fileId",
      ExpressionAttributeValues: {
        ":fileId": cleanFileId,
      },
      Limit: 1, // We only need one result
    });

    try {
      console.log("Sending scan command to DynamoDB");
      const response = await docClient.send(command);
      console.log(`Scan response: ${JSON.stringify(response)}`);
      
      // Check if we have items in the response
      if (response.Items && response.Items.length > 0) {
        // Return the first item as a File
        const file = response.Items[0] as File;
        console.log(`File found: ${JSON.stringify(file)}`);
        console.log(`File ID: ${file.file_id}, Owner ID: ${file.owner_id}, Name: ${file.name}`);
        return file;
      }
      
      // No items found
      console.log(`No file found with ID: ${cleanFileId}`);
      return null;
    } catch (error) {
      console.error("Error getting file by ID:", error);
      if (error instanceof Error) {
        console.error(`Error name: ${error.name}, message: ${error.message}`);
        if (error.stack) {
          console.error(`Stack trace: ${error.stack}`);
        }
      }
      throw error;
    }
  },

  async createFile(file: File): Promise<File> {
    const command = new PutCommand({
      TableName: "LissnerFiles",
      Item: file,
    });

    try {
      await docClient.send(command);
      return file;
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    // First, get the file to get the owner_id
    const file = await this.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    const command = new DeleteCommand({
      TableName: "LissnerFiles",
      Key: {
        owner_id: file.owner_id,
        file_id: fileId,
      },
    });

    try {
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  // Comment functions
  async getCommentsByFileId(fileId: string): Promise<Comment[]> {
    // Remove any file extension from the file ID
    const cleanFileId = fileId.split('.')[0];
    
    // Get the file which contains the comments
    const file = await this.getFileById(cleanFileId);
    
    if (!file) {
      console.log(`No file found with ID: ${cleanFileId}`);
      return [];
    }
    
    // Return the comments array from the file or an empty array if it doesn't exist
    return (file as File & { comments?: Comment[] }).comments || [];
  },

  async getCommentById(commentId: string): Promise<Comment | null> {
    // Since comments are stored in the file document, we need to scan all files
    // to find the comment with the matching ID
    const command = new ScanCommand({
      TableName: "LissnerFiles",
      FilterExpression: "contains(comments, :commentId)",
      ExpressionAttributeValues: {
        ":commentId": commentId,
      },
    });

    try {
      const response = await docClient.send(command);
      
      if (response.Items && response.Items.length > 0) {
        // Find the comment in the file's comments array
        const file = response.Items[0] as File & { comments?: Comment[] };
        if (file.comments) {
          const comment = file.comments.find(c => c.id === commentId);
          if (comment) {
            return comment;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error getting comment by ID:", error);
      throw error;
    }
  },

  async createComment(comment: Comment): Promise<Comment> {
    // Get the file to update
    const file = await this.getFileById(comment.file_id);
    
    if (!file) {
      throw new Error(`File not found: ${comment.file_id}`);
    }
    
    // Initialize comments array if it doesn't exist
    const fileWithComments = file as File & { comments?: Comment[] };
    const comments = fileWithComments.comments || [];
    
    // Add the new comment
    comments.push(comment);
    
    // Update the file with the new comment
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "SET comments = :comments",
      ExpressionAttributeValues: {
        ":comments": comments,
      },
      ReturnValues: "ALL_NEW",
    });

    try {
      await docClient.send(command);
      return comment;
    } catch (error) {
      console.error("Error creating comment:", error);
      throw error;
    }
  },

  async deleteComment(commentId: string): Promise<void> {
    // First, find the file containing the comment
    const comment = await this.getCommentById(commentId);
    
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }
    
    // Get the file
    const file = await this.getFileById(comment.file_id);
    
    if (!file) {
      throw new Error(`File not found: ${comment.file_id}`);
    }
    
    // Filter out the comment to delete
    const fileWithComments = file as File & { comments?: Comment[] };
    const updatedComments = (fileWithComments.comments || []).filter((c: Comment) => c.id !== commentId);
    
    // Update the file with the filtered comments
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "SET comments = :comments",
      ExpressionAttributeValues: {
        ":comments": updatedComments,
      },
    });

    try {
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },

  async deleteCommentsByFileId(fileId: string): Promise<void> {
    // Get the file
    const file = await this.getFileById(fileId);
    
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // Update the file to remove all comments
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "REMOVE comments",
    });

    try {
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting comments by file ID:", error);
      throw error;
    }
  },

  // Tag functions
  async getTagsByFileId(fileId: string): Promise<Tag[]> {
    // Remove any file extension from the file ID
    const cleanFileId = fileId.split('.')[0];
    
    // Get the file which contains the tags
    const file = await this.getFileById(cleanFileId);
    
    if (!file) {
      console.log(`No file found with ID: ${cleanFileId}`);
      return [];
    }
    
    // Return the tags array from the file or an empty array if it doesn't exist
    return (file as File & { tags?: Tag[] }).tags || [];
  },

  async getTagById(tagId: string): Promise<Tag | null> {
    // Since tags are stored in the file document, we need to scan all files
    // to find the tag with the matching ID
    const command = new ScanCommand({
      TableName: "LissnerFiles",
      FilterExpression: "contains(tags, :tagId)",
      ExpressionAttributeValues: {
        ":tagId": tagId,
      },
    });

    try {
      const response = await docClient.send(command);
      
      if (response.Items && response.Items.length > 0) {
        // Find the tag in the file's tags array
        const file = response.Items[0] as File & { tags?: Tag[] };
        if (file.tags) {
          const tag = file.tags.find(t => t.id === tagId);
          if (tag) {
            return tag;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error getting tag by ID:", error);
      throw error;
    }
  },

  async createTag(tag: Tag): Promise<Tag> {
    // Get the file to update
    const file = await this.getFileById(tag.file_id);
    
    if (!file) {
      throw new Error(`File not found: ${tag.file_id}`);
    }
    
    // Initialize tags array if it doesn't exist
    const fileWithTags = file as File & { tags?: Tag[] };
    const tags = fileWithTags.tags || [];
    
    // Add the new tag
    tags.push(tag);
    
    // Update the file with the new tag
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "SET tags = :tags",
      ExpressionAttributeValues: {
        ":tags": tags,
      },
      ReturnValues: "ALL_NEW",
    });

    try {
      await docClient.send(command);
      return tag;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  },

  async deleteTag(tagId: string): Promise<void> {
    // First, find the file containing the tag
    const tag = await this.getTagById(tagId);
    
    if (!tag) {
      throw new Error(`Tag not found: ${tagId}`);
    }
    
    // Get the file
    const file = await this.getFileById(tag.file_id);
    
    if (!file) {
      throw new Error(`File not found: ${tag.file_id}`);
    }
    
    // Filter out the tag to delete
    const fileWithTags = file as File & { tags?: Tag[] };
    const updatedTags = (fileWithTags.tags || []).filter((t: Tag) => t.id !== tagId);
    
    // Update the file with the filtered tags
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "SET tags = :tags",
      ExpressionAttributeValues: {
        ":tags": updatedTags,
      },
    });

    try {
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting tag:", error);
      throw error;
    }
  },

  async deleteTagsByFileId(fileId: string): Promise<void> {
    // Get the file
    const file = await this.getFileById(fileId);
    
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    // Update the file to remove all tags
    const command = new UpdateCommand({
      TableName: "LissnerFiles",
      Key: {
        file_id: file.file_id,
        owner_id: file.owner_id,
      },
      UpdateExpression: "REMOVE tags",
    });

    try {
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting tags by file ID:", error);
      throw error;
    }
  },
};

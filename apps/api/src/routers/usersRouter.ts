import { Router, Request, Response } from "express";
import { z } from "zod";
import { dynamodb } from "../aws/dynamodb";
import type { CreateUserData, UpdateUserData } from "@lissner/types";

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const usersRouter = Router();

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
}) as z.ZodType<CreateUserData>;

const updateUserSchema = z
    .object({
        name: z.string().optional(),
        // Add other updatable fields here
    })
    .partial() as z.ZodType<UpdateUserData>;

// Get paginated users
usersRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const limit = parseInt(req.query.limit as string) || 10;
        const lastEvaluatedKey = req.query.lastEvaluatedKey
            ? JSON.parse(decodeURIComponent(req.query.lastEvaluatedKey as string))
            : undefined;

        const result = await dynamodb.scanUsers(limit, lastEvaluatedKey);
        res.json(result);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Get current user
usersRouter.get("/current", async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const user = await dynamodb.getUserById(userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching current user:", error);
        res.status(500).json({ error: "Failed to fetch current user" });
    }
});

// Get user by email
usersRouter.get("/email/:email", async (req, res) => {
    try {
        const user = await dynamodb.getUserByEmail(req.params.email);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Get user by ID
usersRouter.get("/:id", async (req, res) => {
    try {
        const user = await dynamodb.getUserById(req.params.id);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Create user
usersRouter.post("/", async (req, res) => {
    try {
        const validatedData = createUserSchema.parse(req.body);
        const user = await dynamodb.createUser(validatedData);
        res.status(201).json(user);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: error.errors });
            return;
        }
        if (
            error instanceof Error &&
            error.message.includes("ConditionalCheckFailedException")
        ) {
            res.status(409).json({ error: "User with this email already exists" });
            return;
        }
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// Update user
usersRouter.patch("/:id", async (req, res) => {
    try {
        console.log("Update user request:", {
            userId: req.params.id,
            body: req.body
        });
        
        const validatedData = updateUserSchema.parse(req.body);
        console.log("Validated update data:", validatedData);
        
        const user = await dynamodb.updateUser(req.params.id, validatedData);
        console.log("Update result:", user);

        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid input", details: error.errors });
            return;
        }
        // Log the full error details
        const err = error as Error;
        console.error("Full error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ error: "Failed to update user" });
    }
});

// Delete user
usersRouter.delete("/:id", async (req, res) => {
    try {
        const deleted = await dynamodb.deleteUser(req.params.id);

        if (!deleted) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(204).send();
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

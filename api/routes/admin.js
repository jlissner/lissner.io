const express = require('express');
const { QueryCommand, PutCommand, GetCommand, ScanCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb, TABLE_NAMES } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Add family member (create user)
router.post('/users', async (req, res) => {
  try {
    const { email, isAdmin = false } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingResult = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAMES.USERS,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': normalizedEmail,
      },
    }));

    if (existingResult.Items.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const newUser = {
      id: require('uuid').v4(),
      email: normalizedEmail,
      isAdmin: Boolean(isAdmin),
      createdAt: new Date().toISOString(),
      addedBy: req.user.email,
    };
    
    await dynamodb.send(new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: newUser,
    }));

    res.json({ 
      message: 'Family member added successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt,
      }
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// Remove family member (delete user)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user to delete
    const userResult = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: userId },
    }));

    if (!userResult.Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userToDelete = userResult.Item;

    // Don't allow removing self if user is the only admin
    if (userToDelete.id === req.user.id) {
      const adminsResult = await dynamodb.send(new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        FilterExpression: 'isAdmin = :true',
        ExpressionAttributeValues: {
          ':true': true,
        },
      }));

      if (adminsResult.Items.length <= 1) {
        return res.status(400).json({ 
          error: 'Cannot remove the last admin' 
        });
      }
    }

    await dynamodb.send(new DeleteCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: userId },
    }));

    res.json({ message: 'Family member removed successfully' });
  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove family member' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: TABLE_NAMES.USERS,
    }));

    const users = result.Items.map(user => ({
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin || false,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    }));

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user admin status
router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'isAdmin must be a boolean' });
    }

    // Get user to update
    const userResult = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: userId },
    }));

    if (!userResult.Item) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userResult.Item;

    // Don't allow removing admin from self if user is the only admin
    if (!isAdmin && targetUser.id === req.user.id) {
      const adminsResult = await dynamodb.send(new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        FilterExpression: 'isAdmin = :true',
        ExpressionAttributeValues: {
          ':true': true,
        },
      }));

      if (adminsResult.Items.length <= 1) {
        return res.status(400).json({ 
          error: 'Cannot remove admin privileges from the last admin' 
        });
      }
    }

    // Update user
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: userId },
      UpdateExpression: 'SET isAdmin = :isAdmin',
      ExpressionAttributeValues: {
        ':isAdmin': isAdmin,
      },
    }));

    res.json({ 
      message: `User admin status ${isAdmin ? 'granted' : 'removed'} successfully` 
    });
  } catch (error) {
    console.error('Update user admin error:', error);
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

module.exports = router; 
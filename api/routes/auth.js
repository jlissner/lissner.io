const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { QueryCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb, TABLE_NAMES } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendMagicLinkEmail } = require('../utils/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Send magic link
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists (serves as whitelist)
    const userQuery = {
      TableName: TABLE_NAMES.USERS,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    };

    const userResult = await dynamodb.send(new QueryCommand(userQuery));

    if (userResult.Items.length === 0) {
      return res.status(403).json({ 
        error: 'Email not authorized. Please contact an admin to be added to the family.' 
      });
    }

    // Generate magic link token
    const token = uuidv4();
    const expiresAt = Math.floor(Date.now() / 1000) + (15 * 60); // 15 minutes

    // Store magic link token
    const magicLinkItem = {
      token,
      email,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    
    await dynamodb.send(new PutCommand({
      TableName: TABLE_NAMES.MAGIC_LINKS,
      Item: magicLinkItem,
    }));

    // Send email
    const magicLink = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
    await sendMagicLinkEmail(email, magicLink);

    res.json({ message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Magic link creation failed:', error.message);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

// Verify magic link
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get magic link from database
    const magicLinkResult = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAMES.MAGIC_LINKS,
      Key: { token },
    }));

    if (!magicLinkResult.Item) {
      return res.status(400).json({ error: 'Invalid or expired magic link' });
    }

    const magicLink = magicLinkResult.Item;
    const now = Math.floor(Date.now() / 1000);

    if (now > magicLink.expiresAt) {
      // Clean up expired token
      await dynamodb.send(new DeleteCommand({
        TableName: TABLE_NAMES.MAGIC_LINKS,
        Key: { token },
      }));
      
      return res.status(400).json({ error: 'Magic link has expired' });
    }

    // Get existing user (we know they exist from magic link request check)
    const userResult = await dynamodb.send(new QueryCommand({
      TableName: TABLE_NAMES.USERS,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': magicLink.email.toLowerCase(),
      },
    }));

    if (userResult.Items.length === 0) {
      return res.status(400).json({ error: 'User not found. Please contact an admin.' });
    }

    const user = userResult.Items[0];
    
    // Update last login
    await dynamodb.send(new UpdateCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: user.id },
      UpdateExpression: 'SET lastLogin = :lastLogin',
      ExpressionAttributeValues: {
        ':lastLogin': new Date().toISOString(),
      },
    }));

    // Clean up magic link
    await dynamodb.send(new DeleteCommand({
      TableName: TABLE_NAMES.MAGIC_LINKS,
      Key: { token },
    }));

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify magic link' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    isAdmin: req.user.isAdmin,
    createdAt: req.user.createdAt,
  });
});

module.exports = router; 
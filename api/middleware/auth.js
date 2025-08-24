const jwt = require('jsonwebtoken');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb, TABLE_NAMES } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const result = await dynamodb.send(new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { id: decoded.userId },
    }));

    if (!result.Item) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = result.Item;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
}; 
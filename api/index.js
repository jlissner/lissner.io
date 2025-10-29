// Load environment variables from .env.local file
require('dotenv').config({ path: '../.env.local' });

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const multer = require('multer');

// Environment variable validation
function validateEnvironmentVariables() {
  const requiredEnvVars = [
    'AWS_DEFAULT_REGION',
    'AWS_SES_REGION', 
    'AWS_S3_BUCKET',
    'AWS_SES_FROM_EMAIL',
    'STAGE',
    'JWT_SECRET',
    'FRONTEND_URL'
  ];

  const missingVars = [];
  const emptyVars = [];

  console.log('=== Environment Variable Validation ===');
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? `"${value}"` : 'UNDEFINED'}`);
    
    if (value === undefined) {
      missingVars.push(varName);
    } else if (value === '') {
      emptyVars.push(varName);
    }
  });

  if (missingVars.length > 0 || emptyVars.length > 0) {
    console.error('\n❌ SERVER STARTUP FAILED - Missing Environment Variables');
    console.error('='.repeat(60));
    
    if (missingVars.length > 0) {
      console.error('\n🚫 UNDEFINED Variables:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
    }
    
    if (emptyVars.length > 0) {
      console.error('\n⚠️  EMPTY Variables:');
      emptyVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
    }
    
    console.error('\n💡 Please set these environment variables and restart the server.');
    console.error('   You can set them in:');
    console.error('   - api/.env.local (for local development)');
    console.error('   - Your deployment environment');
    console.error('   - Or export them directly: export VAR_NAME=value');
    
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
  console.log('='.repeat(50));
}

// Validate environment variables before starting server
validateEnvironmentVariables();

// Import routes
const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/photos', photoRoutes(upload));
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Export for serverless
module.exports.handler = serverless(app);

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 
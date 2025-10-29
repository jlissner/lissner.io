#!/usr/bin/env node

/**
 * Comprehensive Deployment Script for Lissner Family Website (Node.js)
 * This script handles the complete deployment process
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const execAsync = promisify(exec);

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function colorOutput(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

// Parse command line arguments
const args = process.argv.slice(2);
let stage = 'dev';
let skipAWSSetup = false;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === 'help' || arg === '-h' || arg === '--help') {
    console.log('Usage: node scripts/deploy.js [STAGE] [SKIP_AWS_SETUP]');
    console.log('');
    console.log('Arguments:');
    console.log('  STAGE            Deployment stage (default: dev)');
    console.log('  SKIP_AWS_SETUP   Skip AWS resources setup (default: false)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/deploy.js                    # Deploy to dev stage');
    console.log('  node scripts/deploy.js prod               # Deploy to prod stage');
    console.log('  node scripts/deploy.js dev true           # Deploy to dev but skip AWS setup');
    console.log('');
    console.log('Environment variables required:');
    console.log('  AWS_S3_BUCKET         # Your unique S3 bucket name');
    console.log('  JWT_SECRET            # Secure JWT secret');
    console.log('  FRONTEND_URL          # Your frontend domain');
    console.log('  AWS_SES_FROM_EMAIL    # (Optional) Email for SES');
    process.exit(0);
  } else if (i === 0) {
    stage = arg;
  } else if (i === 1) {
    skipAWSSetup = arg === 'true';
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkEnvironment() {
  colorOutput('🔍 Checking environment variables...', 'blue');
  
  const requiredVars = ['AWS_S3_BUCKET', 'JWT_SECRET', 'FRONTEND_URL'];
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    colorOutput('❌ Missing required environment variables:', 'red');
    for (const varName of missingVars) {
      colorOutput(`   - ${varName}`, 'red');
    }
    console.log('');
    colorOutput('💡 Please set these environment variables before deployment:', 'yellow');
    console.log('   export AWS_S3_BUCKET=your-unique-bucket-name');
    console.log('   export JWT_SECRET=$(openssl rand -base64 32)');
    console.log('   export FRONTEND_URL=https://your-frontend-domain.com');
    if (process.env.AWS_SES_FROM_EMAIL) {
      console.log(`   export AWS_SES_FROM_EMAIL=${process.env.AWS_SES_FROM_EMAIL}`);
      console.log(`   export AWS_SES_REGION=${process.env.AWS_DEFAULT_REGION || 'us-east-1'}`);
    }
    console.log('');
    rl.close();
    process.exit(1);
  }
  
  colorOutput('✅ Environment variables check passed', 'green');
}

async function setupAWSResources() {
  if (skipAWSSetup) {
    colorOutput('⏭️  Skipping AWS resources setup', 'yellow');
    return;
  }
  
  colorOutput('📦 Setting up AWS resources...', 'blue');
  
  const setupScript = path.join(__dirname, 'setup-aws-resources.js');
  if (!fs.existsSync(setupScript)) {
    colorOutput('❌ AWS setup script not found', 'red');
    throw new Error('setup-aws-resources.js not found');
  }
  
  try {
    const { stdout, stderr } = await execAsync(`node "${setupScript}" ${stage}`, {
      env: { ...process.env, STAGE: stage }
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    colorOutput('✅ AWS resources setup completed', 'green');
  } catch (error) {
    colorOutput('❌ AWS resources setup failed', 'red');
    throw error;
  }
}

async function deployAPI() {
  colorOutput('🛠️  Deploying API...', 'blue');
  
  const apiDir = path.join(process.cwd(), 'api');
  if (!fs.existsSync(apiDir)) {
    colorOutput('❌ API directory not found', 'red');
    throw new Error('API directory not found');
  }
  
  // Check if serverless is installed (check if it's in node_modules or globally)
  let serverlessCmd = 'npx serverless';
  try {
    await execAsync('serverless --version', { cwd: apiDir });
    serverlessCmd = 'serverless';
  } catch (error) {
    // Check if it's in node_modules
    const serverlessPath = path.join(process.cwd(), 'node_modules', '.bin', 'serverless');
    if (fs.existsSync(serverlessPath)) {
      serverlessCmd = path.relative(apiDir, serverlessPath);
    } else {
      colorOutput('📦 Serverless Framework not found, using npx...', 'yellow');
    }
  }
  
  // Make sure root dependencies are installed
  const rootNodeModules = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(rootNodeModules)) {
    colorOutput('📦 Installing dependencies in root directory...', 'yellow');
    try {
      const { stdout, stderr } = await execAsync('npm install');
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error) {
      colorOutput(`⚠️  Warning: npm install had issues: ${error.message}`, 'yellow');
    }
  }
  
  // Create symlink to root node_modules for serverless packaging (only on Unix-like systems)
  const apiNodeModules = path.join(apiDir, 'node_modules');
  if (process.platform !== 'win32') {
    if (!fs.existsSync(apiNodeModules)) {
      colorOutput('🔗 Creating symlink to root node_modules...', 'blue');
      try {
        fs.symlinkSync(path.join(process.cwd(), 'node_modules'), apiNodeModules, 'dir');
      } catch (error) {
        if (error.code !== 'EEXIST') {
          colorOutput(`⚠️  Warning: Could not create symlink: ${error.message}`, 'yellow');
        }
      }
    }
  }
  
  // Deploy serverless stack
  colorOutput('🚀 Deploying serverless stack...', 'yellow');
  
  try {
    const { stdout, stderr } = await execAsync(`${serverlessCmd} deploy --stage ${stage} --verbose`, {
      cwd: apiDir,
      env: { ...process.env, STAGE: stage }
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Try to get the API URL
    let apiUrl = null;
    try {
      const { stdout: infoStdout } = await execAsync(`${serverlessCmd} info --stage ${stage}`, {
        cwd: apiDir,
        env: { ...process.env, STAGE: stage }
      });
      const urlMatch = infoStdout.match(/https:\/\/[a-zA-Z0-9\-]+\.execute-api\.[a-zA-Z0-9\-]+\.amazonaws\.com\/[a-zA-Z0-9\-]+/);
      if (urlMatch) {
        apiUrl = urlMatch[0];
      }
    } catch (e) {
      // Ignore errors getting API URL
    }
    
    colorOutput('✅ API deployed successfully', 'green');
    if (apiUrl) {
      colorOutput(`🌐 API URL: ${apiUrl}`, 'blue');
      return apiUrl;
    }
    return null;
  } catch (error) {
    colorOutput('❌ API deployment failed', 'red');
    throw error;
  }
}

async function setupAdminUser() {
  colorOutput('👤 Setting up admin user...', 'blue');
  
  let adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    adminEmail = await askQuestion('Enter admin email address (or press Enter to skip): ');
    if (!adminEmail) {
      colorOutput('⏭️  Skipping admin user setup', 'yellow');
      return;
    }
  }
  
  const setupAdminScript = path.join(__dirname, 'setup-admin.js');
  if (!fs.existsSync(setupAdminScript)) {
    colorOutput('❌ Admin setup script not found', 'red');
    return;
  }
  
  try {
    const { stdout, stderr } = await execAsync(`node "${setupAdminScript}" --email "${adminEmail}" --stage ${stage}`, {
      env: { ...process.env, STAGE: stage }
    });
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    colorOutput('✅ Admin user setup completed', 'green');
  } catch (error) {
    colorOutput('⚠️  Admin user setup failed, but deployment can continue', 'yellow');
  }
}

function displaySummary(stage, adminEmail, apiUrl) {
  console.log('');
  colorOutput('🎉 Deployment Complete!', 'green');
  colorOutput('======================', 'green');
  console.log('');
  colorOutput('📋 What was deployed:', 'blue');
  console.log('  🏗️  AWS Resources (S3, DynamoDB, SES)');
  console.log('  🛠️  Serverless API (Lambda functions)');
  if (adminEmail) {
    console.log(`  👤 Admin user: ${adminEmail}`);
  }
  console.log('');
  colorOutput('📝 Next Steps:', 'blue');
  console.log('  1. Deploy your frontend with the API URL');
  console.log('  2. Update your frontend NEXT_PUBLIC_API_URL environment variable');
  if (apiUrl) {
    console.log(`     NEXT_PUBLIC_API_URL=${apiUrl}`);
  }
  console.log('  3. Test the application');
  console.log('');
  colorOutput('🔧 Useful Commands:', 'blue');
  console.log(`  • Check API logs: cd api && npx serverless logs -f api --stage ${stage}`);
  console.log(`  • Remove deployment: cd api && npx serverless remove --stage ${stage}`);
  console.log(`  • Create another admin: npm run setup-admin`);
  console.log('');
}

async function main() {
  colorOutput('🚀 Lissner Family Website - Complete Deployment', 'blue');
  colorOutput('===============================================', 'blue');
  console.log('');
  console.log(`Stage: ${stage}`);
  console.log(`Skip AWS Setup: ${skipAWSSetup}`);
  console.log('');
  
  try {
    await checkEnvironment();
    console.log('');
    await setupAWSResources();
    console.log('');
    const apiUrl = await deployAPI();
    console.log('');
    await setupAdminUser();
    console.log('');
    displaySummary(stage, process.env.ADMIN_EMAIL, apiUrl);
    console.log('');
    colorOutput('🚀 Deployment successful!', 'green');
  } catch (error) {
    colorOutput(`❌ Deployment failed: ${error.message}`, 'red');
    console.error(error);
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('');
  colorOutput('❌ Deployment cancelled', 'red');
  rl.close();
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  colorOutput(`❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  rl.close();
  process.exit(1);
});


#!/usr/bin/env node

/**
 * Lissner Family Website - Initial Admin Setup Script (Node.js)
 * This script creates the first admin user directly in the users table
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function colorOutput(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^-+/, '').toLowerCase();
  const value = args[i + 1];
  params[key] = value;
}

const email = params.email || '';
const stage = params.stage || process.env.STAGE || 'dev';
const region = params.region || process.env.AWS_DEFAULT_REGION || 'us-west-2';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

async function checkAWSConfiguration() {
  try {
    const stsClient = new STSClient({ region });
    await stsClient.send(new GetCallerIdentityCommand({}));
    colorOutput('✅ AWS CLI is configured', 'green');
    return true;
  } catch (error) {
    colorOutput('❌ AWS CLI is not configured. Please run "aws configure" first.', 'red');
    return false;
  }
}

async function checkDynamoDBTable(tableName, region) {
  try {
    const dynamoClient = new DynamoDBClient({ region });
    await dynamoClient.send(new (require('@aws-sdk/client-dynamodb').DescribeTableCommand)({ TableName: tableName }));
    colorOutput('✅ DynamoDB table found', 'green');
    return true;
  } catch (error) {
    colorOutput(`❌ DynamoDB table '${tableName}' does not exist!`, 'red');
    colorOutput('   Please run the setup-aws-resources script first:', 'yellow');
    colorOutput('   node scripts/setup-aws-resources.js', 'yellow');
    return false;
  }
}

async function checkUserExists(docClient, tableName, email) {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    });

    const result = await docClient.send(command);
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return null;
  }
}

async function updateUserToAdmin(docClient, tableName, userId) {
  try {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: { id: userId },
      UpdateExpression: 'SET isAdmin = :admin',
      ExpressionAttributeValues: {
        ':admin': true
      }
    });

    await docClient.send(command);
    return true;
  } catch (error) {
    console.error('Error updating user to admin:', error);
    return false;
  }
}

async function createAdminUser(docClient, tableName, email) {
  try {
    const userId = uuidv4();
    const currentTime = new Date().toISOString();

    const command = new PutCommand({
      TableName: tableName,
      Item: {
        id: userId,
        email: email,
        isAdmin: true,
        createdAt: currentTime,
        addedBy: 'system'
      }
    });

    await docClient.send(command);
    return userId;
  } catch (error) {
    console.error('Error creating admin user:', error);
    return null;
  }
}

async function main() {
  colorOutput('🚀 Lissner Family Website - Admin Setup', 'blue');
  colorOutput('========================================', 'blue');
  console.log('');

  // Check AWS configuration
  const isAWSConfigured = await checkAWSConfiguration();
  if (!isAWSConfigured) {
    process.exit(1);
  }
  console.log('');

  // Get email if not provided
  let adminEmail = email;
  while (!adminEmail || !validateEmail(adminEmail)) {
    if (adminEmail) {
      colorOutput('❌ Please enter a valid email address', 'red');
    }
    adminEmail = await askQuestion('Enter your email address (this will be the admin): ');
  }

  // Table name
  const usersTable = `lissner-users-${stage}`;

  console.log('');
  colorOutput('📝 Configuration:', 'blue');
  console.log(`   Stage: ${stage}`);
  console.log(`   Region: ${region}`);
  console.log(`   Admin Email: ${adminEmail}`);
  console.log(`   Users Table: ${usersTable}`);
  console.log('');

  // Confirm configuration
  const confirm = await askQuestion('Is this correct? [y/N]: ');
  if (confirm.toLowerCase() !== 'y') {
    colorOutput('❌ Setup cancelled', 'red');
    rl.close();
    process.exit(1);
  }

  console.log('');
  colorOutput('🔍 Checking if DynamoDB table exists...', 'yellow');

  // Check if DynamoDB table exists
  const tableExists = await checkDynamoDBTable(usersTable, region);
  if (!tableExists) {
    rl.close();
    process.exit(1);
  }

  colorOutput('🔍 Checking if user already exists...', 'yellow');

  try {
    // Create DynamoDB client
    const dynamoClient = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    // Check if user already exists
    const existingUser = await checkUserExists(docClient, usersTable, adminEmail);

    let userId;

    if (existingUser) {
      colorOutput('⚠️  User already exists. Making them admin...', 'yellow');

      userId = existingUser.id;
      const updated = await updateUserToAdmin(docClient, usersTable, userId);

      if (updated) {
        colorOutput('✅ Existing user updated to admin successfully', 'green');
      } else {
        throw new Error('Failed to update user to admin');
      }
    } else {
      colorOutput('🔄 Creating new admin user...', 'yellow');

      userId = await createAdminUser(docClient, usersTable, adminEmail);

      if (userId) {
        colorOutput('✅ Admin user created successfully', 'green');
      } else {
        throw new Error('Failed to create admin user');
      }
    }

    console.log('');
    colorOutput('🎉 Setup Complete!', 'green');
    console.log('');
    colorOutput('📋 Admin User Details:', 'blue');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   ID: ${userId}`);
    console.log('   Admin: Yes');
    console.log('');
    colorOutput('📝 Next Steps:', 'blue');
    console.log(`1. Visit your website and log in with ${adminEmail}`);
    console.log('2. Check your email for the magic link');
    console.log('3. You should now have access to the admin panel');
    console.log('4. Use the admin panel to add other family members');
    console.log('');
    colorOutput('🔧 If you need to add more admins later, use:', 'blue');
    console.log('   node scripts/make-admin.js --email another-email@domain.com');
    console.log('');
    colorOutput('📖 For more help, see the README.md and deployment-checklist.md files', 'blue');

  } catch (error) {
    colorOutput(`❌ Error during setup: ${error.message}`, 'red');
    process.exit(1);
  }

  rl.close();
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('');
  colorOutput('❌ Setup cancelled', 'red');
  rl.close();
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  colorOutput(`❌ Unexpected error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
}); 
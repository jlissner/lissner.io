#!/usr/bin/env node

/**
 * AWS Resources Setup Script for Lissner Family Website (Node.js)
 * This script creates all necessary AWS resources that don't already exist
 */

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand, PutPublicAccessBlockCommand, GetBucketLocationCommand } = require('@aws-sdk/client-s3');
const { SESClient, GetIdentityVerificationAttributesCommand, VerifyEmailIdentityCommand, GetSendQuotaCommand } = require('@aws-sdk/client-ses');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const readline = require('readline');

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
const stage = args[0] || process.env.STAGE || 'dev';
const region = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const s3Bucket = process.env.AWS_S3_BUCKET;
const sesEmail = process.env.AWS_SES_FROM_EMAIL;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function checkAWSConfiguration(stsClient) {
  try {
    await stsClient.send(new GetCallerIdentityCommand({}));
    colorOutput('✅ AWS CLI is configured', 'green');
    return true;
  } catch (error) {
    colorOutput('❌ AWS CLI is not configured. Please run "aws configure" first.', 'red');
    return false;
  }
}

async function checkOrCreateS3Bucket(s3Client, bucketName, region) {
  colorOutput(`📦 Checking S3 bucket: ${bucketName}`, 'yellow');
  
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    colorOutput('✅ S3 bucket already exists', 'green');
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      colorOutput('📦 Creating S3 bucket...', 'yellow');
      
      try {
        // For us-east-1, LocationConstraint should not be specified
        const createParams = { Bucket: bucketName };
        if (region !== 'us-east-1') {
          createParams.CreateBucketConfiguration = { LocationConstraint: region };
        }
        
        await s3Client.send(new CreateBucketCommand(createParams));
        colorOutput('✅ S3 bucket created successfully', 'green');
      } catch (createError) {
        colorOutput(`❌ Failed to create S3 bucket: ${createError.message}`, 'red');
        throw createError;
      }
    } else {
      colorOutput(`❌ Error checking S3 bucket: ${error.message}`, 'red');
      throw error;
    }
  }
  
  // Configure bucket settings
  colorOutput('📦 Configuring S3 bucket settings...', 'yellow');
  
  try {
    // Set Block Public Access
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false
      }
    }));
    
    // Set bucket policy for public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`
        }
      ]
    };
    
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    }));
    
    // Enable CORS
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    }));
    
    colorOutput('✅ S3 bucket configured successfully', 'green');
  } catch (error) {
    colorOutput(`⚠️  Warning: Some bucket configuration failed: ${error.message}`, 'yellow');
  }
}

async function checkOrCreateDynamoDBTable(dynamoClient, tableConfig) {
  const { tableName, keySchema, attributeDefinitions, gsiConfig } = tableConfig;
  
  colorOutput(`🗄️  Checking DynamoDB table: ${tableName}`, 'yellow');
  
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    colorOutput(`✅ Table ${tableName} already exists`, 'green');
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      colorOutput(`🗄️  Creating DynamoDB table: ${tableName}`, 'yellow');
      
      try {
        const createParams = {
          TableName: tableName,
          KeySchema: keySchema,
          AttributeDefinitions: attributeDefinitions,
          BillingMode: 'PAY_PER_REQUEST'
        };
        
        if (gsiConfig && gsiConfig.length > 0) {
          createParams.GlobalSecondaryIndexes = gsiConfig;
        }
        
        await dynamoClient.send(new CreateTableCommand(createParams));
        
        // Wait for table to become active
        colorOutput('⏳ Waiting for table to become active...', 'yellow');
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
          try {
            const describeResult = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
            if (describeResult.Table.TableStatus === 'ACTIVE') {
              break;
            }
          } catch (e) {
            // Table might not exist yet
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
        
        colorOutput(`✅ Table ${tableName} created successfully`, 'green');
      } catch (createError) {
        colorOutput(`❌ Failed to create table: ${createError.message}`, 'red');
        throw createError;
      }
    } else {
      colorOutput(`❌ Error checking table: ${error.message}`, 'red');
      throw error;
    }
  }
}

async function createDynamoDBTables(dynamoClient, stage, region) {
  colorOutput('🗄️  Setting up DynamoDB tables...', 'blue');
  
  // Users table
  await checkOrCreateDynamoDBTable(dynamoClient, {
    tableName: `lissner-users-${stage}`,
    keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    attributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    gsiConfig: [{
      IndexName: 'EmailIndex',
      KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' }
    }]
  });
  
  // Photos table
  await checkOrCreateDynamoDBTable(dynamoClient, {
    tableName: `lissner-photos-${stage}`,
    keySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    attributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'uploadedAt', AttributeType: 'S' },
      { AttributeName: 'photoType', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'albumId', AttributeType: 'S' }
    ],
    gsiConfig: [
      {
        IndexName: 'UserPhotosIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'AlbumPhotosIndex',
        KeySchema: [
          { AttributeName: 'albumId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'ChronologicalIndex',
        KeySchema: [
          { AttributeName: 'photoType', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ]
  });
  
  // Magic Links table
  await checkOrCreateDynamoDBTable(dynamoClient, {
    tableName: `lissner-magic-links-${stage}`,
    keySchema: [{ AttributeName: 'token', KeyType: 'HASH' }],
    attributeDefinitions: [
      { AttributeName: 'token', AttributeType: 'S' }
    ],
    gsiConfig: []
  });
  
  // Set TTL for magic links table
  colorOutput('⏰ Setting up TTL for magic links table...', 'yellow');
  try {
    await dynamoClient.send(new UpdateTimeToLiveCommand({
      TableName: `lissner-magic-links-${stage}`,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: 'expiresAt'
      }
    }));
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      colorOutput(`⚠️  TTL might already be configured: ${error.message}`, 'yellow');
    }
  }
}

async function setupSES(sesClient, email, region) {
  colorOutput('📧 Setting up SES (Simple Email Service)...', 'blue');
  
  if (!email) {
    colorOutput('⚠️  No SES email provided. Skipping SES setup.', 'yellow');
    colorOutput('💡 Set AWS_SES_FROM_EMAIL environment variable to configure SES', 'yellow');
    return;
  }
  
  colorOutput(`📧 Verifying email: ${email}`, 'yellow');
  
  try {
    const verificationAttrs = await sesClient.send(new GetIdentityVerificationAttributesCommand({
      Identities: [email]
    }));
    
    const status = verificationAttrs.VerificationAttributes[email]?.VerificationStatus;
    if (status === 'Success') {
      colorOutput(`✅ Email ${email} is already verified`, 'green');
    } else {
      colorOutput('📧 Requesting email verification...', 'yellow');
      await sesClient.send(new VerifyEmailIdentityCommand({ EmailAddress: email }));
      colorOutput(`📬 Verification email sent to ${email}`, 'yellow');
      colorOutput('💡 Please check your email and click the verification link', 'yellow');
    }
    
    // Check sandbox status
    colorOutput('🔍 Checking SES sandbox status...', 'yellow');
    const quota = await sesClient.send(new GetSendQuotaCommand({}));
    if (quota.Max24HourSend === 200) {
      colorOutput('⚠️  SES is in sandbox mode (can only send to verified emails)', 'yellow');
      colorOutput('💡 For production use, request to exit sandbox mode in SES console', 'yellow');
    } else {
      colorOutput('✅ SES is in production mode', 'green');
    }
  } catch (error) {
    colorOutput(`⚠️  SES setup warning: ${error.message}`, 'yellow');
  }
}

function displaySummary(stage, region, s3Bucket, sesEmail) {
  console.log('');
  colorOutput('🎉 AWS Resources Setup Complete!', 'green');
  colorOutput('=================================', 'green');
  console.log('');
  colorOutput('📋 Resources Created/Verified:', 'blue');
  console.log(`  🪣 S3 Bucket: ${s3Bucket}`);
  console.log('  🗄️  DynamoDB Tables:');
  console.log(`     - lissner-users-${stage}`);
  console.log(`     - lissner-photos-${stage}`);
  console.log(`     - lissner-magic-links-${stage}`);
  if (sesEmail) {
    console.log(`  📧 SES Email: ${sesEmail} (verify in email if new)`);
  }
  console.log('');
  colorOutput('📝 Next Steps:', 'blue');
  console.log('  1. Update your environment files with these resource names');
  console.log('  2. Deploy your serverless backend: npm run api:deploy');
  console.log('  3. Create your first admin user: npm run setup-admin');
  console.log('  4. Deploy your frontend (Vercel/Amplify/etc.)');
  console.log('');
  colorOutput('💡 Environment Variables for API Deployment:', 'blue');
  console.log(`  export AWS_S3_BUCKET=${s3Bucket}`);
  console.log(`  export AWS_DEFAULT_REGION=${region}`);
  if (sesEmail) {
    console.log(`  export AWS_SES_FROM_EMAIL=${sesEmail}`);
    console.log(`  export AWS_SES_REGION=${region}`);
  }
  console.log('  export JWT_SECRET=your-secure-jwt-secret-here');
  console.log('  export FRONTEND_URL=https://your-frontend-domain.com');
  console.log(`  export STAGE=${stage}`);
  console.log('');
  colorOutput('🔧 Additional Setup Required:', 'blue');
  console.log('  • Set JWT_SECRET to a secure random string (use: openssl rand -base64 32)');
  console.log('  • Update FRONTEND_URL to your actual frontend domain');
  if (sesEmail) {
    console.log('  • Verify your SES email address before first deployment');
  }
  console.log('');
}

async function main() {
  colorOutput('🚀 Lissner Family Website - AWS Resources Setup', 'blue');
  colorOutput('=================================================', 'blue');
  console.log('');
  console.log(`Stage: ${stage}`);
  console.log(`Region: ${region}`);
  console.log(`S3 Bucket: ${s3Bucket || '(not set)'}`);
  console.log(`SES Email: ${sesEmail || '(not set)'}`);
  console.log('');
  
  // Validate required environment variables
  if (!s3Bucket) {
    colorOutput('❌ AWS_S3_BUCKET environment variable is required', 'red');
    colorOutput('💡 Example: export AWS_S3_BUCKET=your-unique-bucket-name', 'yellow');
    rl.close();
    process.exit(1);
  }
  
  if (!sesEmail) {
    colorOutput('⚠️  AWS_SES_FROM_EMAIL not set. Email functionality will be skipped.', 'yellow');
  }
  
  const confirm = await askQuestion('Is this correct? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    colorOutput('Exiting...', 'yellow');
    rl.close();
    process.exit(1);
  }
  
  // Initialize AWS clients
  const stsClient = new STSClient({ region });
  const s3Client = new S3Client({ region });
  const dynamoClient = new DynamoDBClient({ region });
  const sesClient = sesEmail ? new SESClient({ region }) : null;
  
  // Check AWS configuration
  const isConfigured = await checkAWSConfiguration(stsClient);
  if (!isConfigured) {
    rl.close();
    process.exit(1);
  }
  console.log('');
  
  // Create resources
  try {
    await checkOrCreateS3Bucket(s3Client, s3Bucket, region);
    console.log('');
    await createDynamoDBTables(dynamoClient, stage, region);
    console.log('');
    if (sesClient && sesEmail) {
      await setupSES(sesClient, sesEmail, region);
      console.log('');
    }
    
    displaySummary(stage, region, s3Bucket, sesEmail);
  } catch (error) {
    colorOutput(`❌ Error during setup: ${error.message}`, 'red');
    console.error(error);
    rl.close();
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
  console.error(error);
  rl.close();
  process.exit(1);
});


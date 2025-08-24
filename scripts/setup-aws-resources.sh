#!/bin/bash

# AWS Resources Setup Script for Lissner Family Website
# This script creates all necessary AWS resources that don't already exist

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values - updated for consistency with serverless.yml
STAGE=${1:-dev}
REGION=${AWS_DEFAULT_REGION:-us-east-1}
S3_BUCKET=${AWS_S3_BUCKET}
SES_EMAIL=${AWS_SES_FROM_EMAIL}

# Validate required environment variables
if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ AWS_S3_BUCKET environment variable is required${NC}"
    echo -e "${YELLOW}💡 Example: export AWS_S3_BUCKET=your-unique-bucket-name${NC}"
    exit 1
fi

if [ -z "$SES_EMAIL" ]; then
    echo -e "${YELLOW}⚠️  AWS_SES_FROM_EMAIL not set. Email functionality will be skipped.${NC}"
fi

echo -e "${BLUE}🚀 Lissner Family Website - AWS Resources Setup${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "S3 Bucket: $S3_BUCKET"
echo "SES Email: $SES_EMAIL"
echo ""
read -p "Is this correct? (y/N): " confirm
if [ "$confirm" != "y" ]; then
    echo "Exiting..."
    exit 1
fi

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ AWS CLI is configured${NC}"
}

# Function to create S3 bucket
create_s3_bucket() {
    echo -e "${YELLOW}📦 Checking S3 bucket: ${S3_BUCKET}${NC}"
    
    if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
        echo -e "${GREEN}✅ S3 bucket already exists${NC}"
    else
        echo -e "${YELLOW}📦 Creating S3 bucket...${NC}"
        
        # Use 's3 mb' which automatically handles LocationConstraint
        aws s3 mb s3://"$S3_BUCKET" --region "$REGION"
        
        echo -e "${GREEN}✅ S3 bucket created successfully${NC}"
    fi
    
    # Configure bucket settings (whether bucket is new or existing)
    echo -e "${YELLOW}📦 Configuring S3 bucket settings...${NC}"
    
    # First, configure Block Public Access settings to allow public bucket policy
    echo -e "${YELLOW}🔐 Configuring Block Public Access settings...${NC}"
    cat > /tmp/block-public-access.json << EOF
{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
}
EOF
    
    aws s3api put-public-access-block --bucket "$S3_BUCKET" --public-access-block-configuration file:///tmp/block-public-access.json
    rm /tmp/block-public-access.json
    
    # Set bucket policy for public read access to photos
    echo -e "${YELLOW}🔒 Applying bucket policy...${NC}"
    cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET}/*"
        }
    ]
}
EOF
        
        aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file:///tmp/bucket-policy.json
        rm /tmp/bucket-policy.json
        
        # Enable CORS
        cat > /tmp/cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF
        
        aws s3api put-bucket-cors --bucket "$S3_BUCKET" --cors-configuration file:///tmp/cors-config.json
        rm /tmp/cors-config.json
        
        echo -e "${GREEN}✅ S3 bucket configured successfully${NC}"
}

# Function to create DynamoDB table
create_dynamodb_table() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local gsi_config=$4
    
    echo -e "${YELLOW}🗄️  Checking DynamoDB table: ${table_name}${NC}"
    
    if aws dynamodb describe-table --table-name "$table_name" --region "$REGION" &>/dev/null; then
        echo -e "${GREEN}✅ Table ${table_name} already exists${NC}"
    else
        echo -e "${YELLOW}🗄️  Creating DynamoDB table: ${table_name}${NC}"
        
        local create_cmd="aws dynamodb create-table --table-name $table_name --region $REGION"
        create_cmd="$create_cmd --key-schema $key_schema"
        create_cmd="$create_cmd --attribute-definitions $attribute_definitions"
        create_cmd="$create_cmd --billing-mode PAY_PER_REQUEST"
        
        if [ -n "$gsi_config" ]; then
            create_cmd="$create_cmd --global-secondary-indexes $gsi_config"
        fi
        
        eval $create_cmd
        
        echo -e "${YELLOW}⏳ Waiting for table to become active...${NC}"
        aws dynamodb wait table-exists --table-name "$table_name" --region "$REGION"
        
        echo -e "${GREEN}✅ Table ${table_name} created successfully${NC}"
    fi
}

# Function to create all DynamoDB tables
create_dynamodb_tables() {
    echo -e "${BLUE}🗄️  Setting up DynamoDB tables...${NC}"
    
    # Users table
    create_dynamodb_table \
        "lissner-users-${STAGE}" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S AttributeName=email,AttributeType=S" \
        '[{
            "IndexName": "EmailIndex",
            "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "ALL"},
            "BillingMode": "PAY_PER_REQUEST"
        }]'
    
    # Photos table with optimized GSI structure for all access patterns
    create_dynamodb_table \
        "lissner-photos-${STAGE}" \
        "AttributeName=id,KeyType=HASH" \
        "AttributeName=id,AttributeType=S AttributeName=uploadedAt,AttributeType=S AttributeName=photoType,AttributeType=S AttributeName=userId,AttributeType=S AttributeName=albumId,AttributeType=S" \
        '[{
            "IndexName": "UserPhotosIndex",
            "KeySchema": [
                {"AttributeName": "userId", "KeyType": "HASH"},
                {"AttributeName": "uploadedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "BillingMode": "PAY_PER_REQUEST"
        }, {
            "IndexName": "AlbumPhotosIndex", 
            "KeySchema": [
                {"AttributeName": "albumId", "KeyType": "HASH"},
                {"AttributeName": "uploadedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "BillingMode": "PAY_PER_REQUEST"
        }, {
            "IndexName": "ChronologicalIndex",
            "KeySchema": [
                {"AttributeName": "photoType", "KeyType": "HASH"},
                {"AttributeName": "uploadedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "BillingMode": "PAY_PER_REQUEST"
        }]'
    
    # Magic Links table
    create_dynamodb_table \
        "lissner-magic-links-${STAGE}" \
        "AttributeName=token,KeyType=HASH" \
        "AttributeName=token,AttributeType=S" \
        ""
    
    # Add TTL to magic links table
    echo -e "${YELLOW}⏰ Setting up TTL for magic links table...${NC}"
    aws dynamodb update-time-to-live \
        --table-name "lissner-magic-links-${STAGE}" \
        --region "$REGION" \
        --time-to-live-specification "Enabled=true,AttributeName=expiresAt" \
        2>/dev/null || echo -e "${YELLOW}⚠️  TTL might already be configured${NC}"
}

# Function to setup SES
setup_ses() {
    echo -e "${BLUE}📧 Setting up SES (Simple Email Service)...${NC}"
    
    if [ -z "$SES_EMAIL" ]; then
        echo -e "${YELLOW}⚠️  No SES email provided. Skipping SES setup.${NC}"
        echo -e "${YELLOW}💡 Set AWS_SES_FROM_EMAIL environment variable to configure SES${NC}"
        return
    fi
    
    echo -e "${YELLOW}📧 Verifying email: ${SES_EMAIL}${NC}"
    
    # Check if email is already verified
    if aws ses get-identity-verification-attributes --identities "$SES_EMAIL" --region "$REGION" \
        | grep -q '"VerificationStatus": "Success"'; then
        echo -e "${GREEN}✅ Email ${SES_EMAIL} is already verified${NC}"
    else
        echo -e "${YELLOW}📧 Requesting email verification...${NC}"
        aws ses verify-email-identity --email-address "$SES_EMAIL" --region "$REGION"
        
        echo -e "${YELLOW}📬 Verification email sent to ${SES_EMAIL}${NC}"
        echo -e "${YELLOW}💡 Please check your email and click the verification link${NC}"
        echo -e "${YELLOW}💡 You can check verification status with:${NC}"
        echo -e "${YELLOW}   aws ses get-identity-verification-attributes --identities ${SES_EMAIL} --region ${REGION}${NC}"
    fi
    
    # Check if we're in sandbox mode
    echo -e "${YELLOW}🔍 Checking SES sandbox status...${NC}"
    SEND_QUOTA=$(aws ses get-send-quota --region "$REGION" --output text --query 'Max24HourSend')
    
    if [ "$SEND_QUOTA" = "200.0" ]; then
        echo -e "${YELLOW}⚠️  SES is in sandbox mode (can only send to verified emails)${NC}"
        echo -e "${YELLOW}💡 For production use, request to exit sandbox mode in SES console${NC}"
    else
        echo -e "${GREEN}✅ SES is in production mode${NC}"
    fi
}

# Function to create IAM role for Lambda (if not using Serverless Framework deployment)
create_lambda_role() {
    echo -e "${BLUE}🔐 Checking Lambda execution role...${NC}"
    
    local role_name="lissner-family-lambda-role-${STAGE}"
    
    if aws iam get-role --role-name "$role_name" &>/dev/null; then
        echo -e "${GREEN}✅ Lambda role already exists${NC}"
    else
        echo -e "${YELLOW}🔐 Creating Lambda execution role...${NC}"
        
        # Trust policy for Lambda
        cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF
        
        aws iam create-role \
            --role-name "$role_name" \
            --assume-role-policy-document file:///tmp/trust-policy.json
        
        # Attach basic Lambda execution policy
        aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        
        # Create custom policy for our resources
        cat > /tmp/lambda-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:${REGION}:*:table/lissner-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${S3_BUCKET}/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
EOF
        
        aws iam create-policy \
            --policy-name "lissner-family-lambda-policy-${STAGE}" \
            --policy-document file:///tmp/lambda-policy.json
        
        aws iam attach-role-policy \
            --role-name "$role_name" \
            --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/lissner-family-lambda-policy-${STAGE}"
        
        rm /tmp/trust-policy.json /tmp/lambda-policy.json
        
        echo -e "${GREEN}✅ Lambda role created successfully${NC}"
        echo -e "${YELLOW}💡 Role ARN: arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${role_name}${NC}"
    fi
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 AWS Resources Setup Complete!${NC}"
    echo -e "${GREEN}=================================${NC}"
    echo ""
    echo -e "${BLUE}📋 Resources Created/Verified:${NC}"
    echo "  🪣 S3 Bucket: $S3_BUCKET"
    echo "  🗄️  DynamoDB Tables:"
    echo "     - lissner-users-${STAGE}"
    echo "     - lissner-photos-${STAGE}"
    echo "     - lissner-magic-links-${STAGE}"
    if [ -n "$SES_EMAIL" ]; then
        echo "  📧 SES Email: $SES_EMAIL (verify in email if new)"
    fi
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo "  1. Update your environment files with these resource names"
    echo "  2. Deploy your serverless backend: cd api && serverless deploy"
    echo "  3. Create your first admin user: bash scripts/setup-admin.sh your-email@domain.com"
    echo "  4. Deploy your frontend (Vercel/Amplify/etc.)"
    echo ""
    echo -e "${BLUE}💡 Environment Variables for API Deployment:${NC}"
    echo "  export AWS_S3_BUCKET=$S3_BUCKET"
    echo "  export AWS_DEFAULT_REGION=$REGION"
    if [ -n "$SES_EMAIL" ]; then
        echo "  export AWS_SES_FROM_EMAIL=$SES_EMAIL"
        echo "  export AWS_SES_REGION=$REGION"
    fi
    echo "  export JWT_SECRET=your-secure-jwt-secret-here"
    echo "  export FRONTEND_URL=https://your-frontend-domain.com"
    echo "  export STAGE=$STAGE"
    echo ""
    echo -e "${BLUE}🔧 Additional Setup Required:${NC}"
    echo "  • Set JWT_SECRET to a secure random string (use: openssl rand -base64 32)"
    echo "  • Update FRONTEND_URL to your actual frontend domain"
    if [ -n "$SES_EMAIL" ]; then
        echo "  • Verify your SES email address before first deployment"
    fi
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}Starting AWS resources setup...${NC}"
    echo ""
    
    check_aws_cli
    create_s3_bucket
    create_dynamodb_tables
    setup_ses
    # create_lambda_role  # Uncomment if not using Serverless Framework
    
    display_summary
}

# Run main function
main 
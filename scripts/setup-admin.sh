#!/bin/bash

# Lissner Family Website - Initial Admin Setup Script
# This script creates the first admin user directly in the users table

set -e

echo "🚀 Lissner Family Website - Admin Setup"
echo "========================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"
echo ""

# Get environment stage
read -p "Enter your deployment stage (default: dev): " STAGE
STAGE=${STAGE:-dev}

# Get admin email
while true; do
    read -p "Enter your email address (this will be the admin): " ADMIN_EMAIL
    if [[ $ADMIN_EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        break
    else
        echo "❌ Please enter a valid email address"
    fi
done

# Table name
USERS_TABLE="lissner-users-$STAGE"
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo ""
echo "📝 Configuration:"
echo "   Stage: $STAGE"
echo "   Region: $REGION"
echo "   Admin Email: $ADMIN_EMAIL"
echo "   Users Table: $USERS_TABLE"
echo ""

# Confirm
read -p "Is this correct? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled"
    exit 1
fi

echo ""
echo "🔍 Checking if user already exists..."

# Check if user already exists
EXISTING_USER=$(aws dynamodb query \
    --table-name "$USERS_TABLE" \
    --index-name EmailIndex \
    --key-condition-expression "email = :email" \
    --expression-attribute-values "{\":email\": {\"S\": \"$ADMIN_EMAIL\"}}" \
    --region "$REGION" \
    --output json 2>/dev/null | jq -r '.Items | length' || echo "0")

if [ "$EXISTING_USER" -gt 0 ]; then
    echo "⚠️  User already exists. Making them admin..."
    
    # Get the user ID
    USER_ID=$(aws dynamodb query \
        --table-name "$USERS_TABLE" \
        --index-name EmailIndex \
        --key-condition-expression "email = :email" \
        --expression-attribute-values "{\":email\": {\"S\": \"$ADMIN_EMAIL\"}}" \
        --region "$REGION" \
        --output json | jq -r '.Items[0].id.S')
    
    # Update user to be admin
    aws dynamodb update-item \
        --table-name "$USERS_TABLE" \
        --key "{\"id\": {\"S\": \"$USER_ID\"}}" \
        --update-expression "SET isAdmin = :admin" \
        --expression-attribute-values "{\":admin\": {\"BOOL\": true}}" \
        --region "$REGION"
    
    echo "✅ Existing user updated to admin successfully"
else
    echo "🔄 Creating new admin user..."
    
    # Generate UUID for user ID
    USER_ID=$(python3 -c "import uuid; print(str(uuid.uuid4()))" 2>/dev/null || \
              node -e "console.log(require('crypto').randomUUID())" 2>/dev/null || \
              uuidgen 2>/dev/null || \
              echo "user-$(date +%s)-$(shuf -i 1000-9999 -n 1)")
    
    # Create new admin user
    aws dynamodb put-item \
        --table-name "$USERS_TABLE" \
        --item "{
            \"id\": {\"S\": \"$USER_ID\"},
            \"email\": {\"S\": \"$ADMIN_EMAIL\"},
            \"isAdmin\": {\"BOOL\": true},
            \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"},
            \"addedBy\": {\"S\": \"system\"}
        }" \
        --region "$REGION"
    
    echo "✅ Admin user created successfully"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Admin User Details:"
echo "   Email: $ADMIN_EMAIL"
echo "   ID: $USER_ID"
echo "   Admin: Yes"
echo ""
echo "📝 Next Steps:"
echo "1. Visit your website and log in with $ADMIN_EMAIL"
echo "2. Check your email for the magic link"
echo "3. You should now have access to the admin panel"
echo "4. Use the admin panel to add other family members"
echo ""
echo "🔧 If you need to add more admins later, use:"
echo "   bash scripts/make-admin.sh another-email@domain.com"
echo ""
echo "📖 For more help, see the README.md and deployment-checklist.md files" 
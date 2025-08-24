#!/bin/bash

# Lissner Family Website - Make User Admin Script
# This script helps promote users to admin status

set -e

echo "👑 Lissner Family Website - Make User Admin"
echo "=========================================="
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
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

# Get user email to promote
while true; do
    read -p "Enter the email address of the user to make admin: " USER_EMAIL
    if [[ $USER_EMAIL =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        break
    else
        echo "❌ Please enter a valid email address"
    fi
done

# Table name
USERS_TABLE="lissner-users-$STAGE"

echo ""
echo "🔍 Looking for user with email: $USER_EMAIL"

# Find user by email
USER_DATA=$(aws dynamodb scan \
    --table-name "$USERS_TABLE" \
    --filter-expression "email = :email" \
    --expression-attribute-values "{\":email\": {\"S\": \"$USER_EMAIL\"}}" \
    --region us-east-1 \
    --output json)

# Check if user exists
USER_COUNT=$(echo "$USER_DATA" | jq -r '.Count')

if [ "$USER_COUNT" -eq 0 ]; then
    echo "❌ User with email $USER_EMAIL not found"
    echo "   Make sure the user has logged in at least once"
    exit 1
fi

if [ "$USER_COUNT" -gt 1 ]; then
    echo "⚠️  Warning: Multiple users found with same email (this shouldn't happen)"
fi

# Get user ID
USER_ID=$(echo "$USER_DATA" | jq -r '.Items[0].id.S')
CURRENT_ADMIN_STATUS=$(echo "$USER_DATA" | jq -r '.Items[0].isAdmin.BOOL // false')

echo "✅ Found user:"
echo "   ID: $USER_ID"
echo "   Email: $USER_EMAIL"
echo "   Current Admin Status: $CURRENT_ADMIN_STATUS"
echo ""

if [ "$CURRENT_ADMIN_STATUS" = "true" ]; then
    echo "ℹ️  User is already an admin"
    read -p "Do you want to remove admin privileges instead? (y/N): " REMOVE_ADMIN
    if [[ $REMOVE_ADMIN =~ ^[Yy]$ ]]; then
        NEW_ADMIN_STATUS="false"
        ACTION="remove admin privileges"
    else
        echo "❌ No changes made"
        exit 0
    fi
else
    NEW_ADMIN_STATUS="true"
    ACTION="grant admin privileges"
fi

echo "🔄 About to $ACTION for user $USER_EMAIL"
read -p "Continue? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Operation cancelled"
    exit 1
fi

# Update user admin status
aws dynamodb update-item \
    --table-name "$USERS_TABLE" \
    --key "{\"id\": {\"S\": \"$USER_ID\"}}" \
    --update-expression "SET isAdmin = :admin" \
    --expression-attribute-values "{\":admin\": {\"BOOL\": $NEW_ADMIN_STATUS}}" \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ Successfully updated user admin status"
    echo ""
    if [ "$NEW_ADMIN_STATUS" = "true" ]; then
        echo "🎉 $USER_EMAIL is now an admin!"
        echo "   They can access the admin panel at /admin"
    else
        echo "👋 Admin privileges removed from $USER_EMAIL"
    fi
else
    echo "❌ Failed to update user admin status"
    exit 1
fi

echo ""
echo "📝 Note: The user may need to log out and back in to see changes" 
#!/bin/bash

# Comprehensive Deployment Script for Lissner Family Website
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
STAGE=${1:-dev}
SKIP_AWS_SETUP=${2:-false}

echo -e "${BLUE}🚀 Lissner Family Website - Complete Deployment${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""
echo "Stage: $STAGE"
echo "Skip AWS Setup: $SKIP_AWS_SETUP"
echo ""

# Function to check environment variables
check_environment() {
    echo -e "${BLUE}🔍 Checking environment variables...${NC}"
    
    local required_vars=("AWS_S3_BUCKET" "JWT_SECRET" "FRONTEND_URL")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}   - $var${NC}"
        done
        echo ""
        echo -e "${YELLOW}💡 Please set these environment variables before deployment:${NC}"
        echo "   export AWS_S3_BUCKET=your-unique-bucket-name"
        echo "   export JWT_SECRET=\$(openssl rand -base64 32)"
        echo "   export FRONTEND_URL=https://your-frontend-domain.com"
        if [ -n "$AWS_SES_FROM_EMAIL" ]; then
            echo "   export AWS_SES_FROM_EMAIL=$AWS_SES_FROM_EMAIL"
            echo "   export AWS_SES_REGION=${AWS_DEFAULT_REGION:-us-east-1}"
        fi
        echo ""
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment variables check passed${NC}"
}

# Function to setup AWS resources
setup_aws_resources() {
    if [ "$SKIP_AWS_SETUP" = "true" ]; then
        echo -e "${YELLOW}⏭️  Skipping AWS resources setup${NC}"
        return
    fi
    
    echo -e "${BLUE}📦 Setting up AWS resources...${NC}"
    
    if [ ! -f "scripts/setup-aws-resources.sh" ]; then
        echo -e "${RED}❌ AWS setup script not found${NC}"
        exit 1
    fi
    
    bash scripts/setup-aws-resources.sh "$STAGE"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ AWS resources setup failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ AWS resources setup completed${NC}"
}

# Function to deploy API
deploy_api() {
    echo -e "${BLUE}🛠️  Deploying API...${NC}"
    
    if [ ! -d "api" ]; then
        echo -e "${RED}❌ API directory not found${NC}"
        exit 1
    fi
    
    cd api
    
    # Check if serverless is installed
    if ! command -v serverless &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Serverless Framework...${NC}"
        npm install -g serverless
    fi
    
    # Note: Dependencies are now installed in root directory
    # Make sure root dependencies are installed
    if [ ! -d "../node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies in root directory...${NC}"
        cd .. && npm install && cd api
    fi
    
    # Create symlink to root node_modules for serverless packaging
    # Serverless needs node_modules in the same directory or it can't package dependencies
    if [ ! -L "node_modules" ] && [ ! -d "node_modules" ]; then
        echo -e "${BLUE}🔗 Creating symlink to root node_modules...${NC}"
        ln -s ../node_modules node_modules
    fi
    
    # Deploy serverless stack
    echo -e "${YELLOW}🚀 Deploying serverless stack...${NC}"
    
    export STAGE="$STAGE"
    serverless deploy --stage "$STAGE" --verbose
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ API deployment failed${NC}"
        cd ..
        exit 1
    fi
    
    # Get the API URL
    API_URL=$(serverless info --stage "$STAGE" | grep -oP 'https://[a-zA-Z0-9\-]+\.execute-api\.[a-zA-Z0-9\-]+\.amazonaws\.com/[a-zA-Z0-9\-]+' | head -1)
    
    cd ..
    
    echo -e "${GREEN}✅ API deployed successfully${NC}"
    if [ -n "$API_URL" ]; then
        echo -e "${BLUE}🌐 API URL: $API_URL${NC}"
    fi
    
    return 0
}

# Function to setup admin user
setup_admin_user() {
    echo -e "${BLUE}👤 Setting up admin user...${NC}"
    
    if [ -z "$ADMIN_EMAIL" ]; then
        read -p "Enter admin email address (or press Enter to skip): " ADMIN_EMAIL
        if [ -z "$ADMIN_EMAIL" ]; then
            echo -e "${YELLOW}⏭️  Skipping admin user setup${NC}"
            return
        fi
    fi
    
    if [ ! -f "scripts/setup-admin.sh" ]; then
        echo -e "${RED}❌ Admin setup script not found${NC}"
        return 1
    fi
    
    bash scripts/setup-admin.sh "$ADMIN_EMAIL"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Admin user setup completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Admin user setup failed, but deployment can continue${NC}"
    fi
}

# Function to display deployment summary
display_summary() {
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo -e "${GREEN}======================${NC}"
    echo ""
    echo -e "${BLUE}📋 What was deployed:${NC}"
    echo "  🏗️  AWS Resources (S3, DynamoDB, SES)"
    echo "  🛠️  Serverless API (Lambda functions)"
    if [ -n "$ADMIN_EMAIL" ]; then
        echo "  👤 Admin user: $ADMIN_EMAIL"
    fi
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo "  1. Deploy your frontend with the API URL"
    echo "  2. Update your frontend NEXT_PUBLIC_API_URL environment variable"
    if [ -n "$API_URL" ]; then
        echo "     NEXT_PUBLIC_API_URL=$API_URL"
    fi
    echo "  3. Test the application"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  • Check API logs: cd api && serverless logs -f api --stage $STAGE"
    echo "  • Remove deployment: cd api && serverless remove --stage $STAGE"
    echo "  • Create another admin: bash scripts/setup-admin.sh user@domain.com"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    echo ""
    
    check_environment
    setup_aws_resources
    deploy_api
    setup_admin_user
    
    display_summary
    
    echo -e "${GREEN}🚀 Deployment successful!${NC}"
}

# Handle script arguments
case "$1" in
    "help"|"-h"|"--help")
        echo "Usage: $0 [STAGE] [SKIP_AWS_SETUP]"
        echo ""
        echo "Arguments:"
        echo "  STAGE            Deployment stage (default: dev)"
        echo "  SKIP_AWS_SETUP   Skip AWS resources setup (default: false)"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy to dev stage"
        echo "  $0 prod               # Deploy to prod stage"
        echo "  $0 dev true           # Deploy to dev but skip AWS setup"
        echo ""
        echo "Environment variables required:"
        echo "  AWS_S3_BUCKET         # Your unique S3 bucket name"
        echo "  JWT_SECRET            # Secure JWT secret"
        echo "  FRONTEND_URL          # Your frontend domain"
        echo "  AWS_SES_FROM_EMAIL    # (Optional) Email for SES"
        echo ""
        exit 0
        ;;
    *)
        main
        ;;
esac 
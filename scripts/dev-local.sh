#!/bin/bash

# Lissner Family Website - Local Development Setup
# Quick script to get everything running locally

echo "🚀 Starting Lissner Family Website Local Development"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

# Frontend environment
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << EOF
# Frontend Local Development
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_USE_MOCK_API=false
EOF
fi

# Backend environment
if [ ! -f "api/.env.local" ]; then
    echo "Creating api/.env.local..."
    
    # Check if api/.env exists to copy from
    if [ -f "api/.env" ]; then
        cp api/.env api/.env.local
        echo "FRONTEND_URL=http://localhost:3000" >> api/.env.local
        echo "NODE_ENV=development" >> api/.env.local
    else
        cat > api/.env.local << EOF
# Backend Local Development
JWT_SECRET=local-development-secret-key-change-in-production
AWS_DEFAULT_REGION=us-east-1
AWS_S3_BUCKET=lissner-family-photos-bucket
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@lissner.io
FRONTEND_URL=http://localhost:3000
STAGE=dev
NODE_ENV=development
EOF
        echo "⚠️  Created api/.env.local with default values"
        echo "   Please update with your actual AWS settings"
    fi
fi

echo "✅ Environment files ready"
echo ""

# Ask user for development mode
echo "Choose development mode:"
echo "1) Full AWS integration (requires AWS setup)"
echo "2) Mock API mode (frontend only, no AWS needed)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "🔗 Using full AWS integration"
        # Update frontend to use real API
        sed -i.bak 's/NEXT_PUBLIC_USE_MOCK_API=true/NEXT_PUBLIC_USE_MOCK_API=false/' .env.local
        echo "📡 Starting backend API server..."
        cd api && npm run dev &
        BACKEND_PID=$!
        echo "Backend started with PID $BACKEND_PID"
        cd ..
        sleep 3
        ;;
    2)
        echo "🎭 Using mock API mode"
        # Update frontend to use mock API
        sed -i.bak 's/NEXT_PUBLIC_USE_MOCK_API=false/NEXT_PUBLIC_USE_MOCK_API=true/' .env.local
        echo "✅ Mock mode enabled - no backend needed"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🌐 Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Development servers started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
if [ "$choice" = "1" ]; then
    echo "🔧 Backend API: http://localhost:3001"
fi
echo ""
echo "To stop all servers, press Ctrl+C"
echo ""

# Wait for user to stop
wait 
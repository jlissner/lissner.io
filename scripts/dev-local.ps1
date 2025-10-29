# Lissner Family Website - Local Development Setup (PowerShell)
# Quick script to get everything running locally on Windows

Write-Host "🚀 Starting Lissner Family Website Local Development" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Create environment files if they don't exist
Write-Host "📝 Setting up environment files..." -ForegroundColor Blue

# Frontend environment
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local..." -ForegroundColor Yellow
    @"
# Frontend Local Development
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_USE_MOCK_API=false
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
}

# Backend environment
if (-not (Test-Path "api/.env.local")) {
    Write-Host "Creating api/.env.local..." -ForegroundColor Yellow
    
    # Check if api/.env exists to copy from
    if (Test-Path "api/.env") {
        Copy-Item "api/.env" "api/.env.local"
        @"
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
"@ | Out-File -FilePath "api/.env.local" -Append -Encoding UTF8
    } else {
        @"
# Backend Local Development
JWT_SECRET=local-development-secret-key-change-in-production
AWS_DEFAULT_REGION=us-east-1
AWS_S3_BUCKET=lissner-family-photos-bucket
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@lissner.io
FRONTEND_URL=http://localhost:3000
STAGE=dev
NODE_ENV=development
"@ | Out-File -FilePath "api/.env.local" -Encoding UTF8
        Write-Host "⚠️  Created api/.env.local with default values" -ForegroundColor Yellow
        Write-Host "   Please update with your actual AWS settings" -ForegroundColor Yellow
    }
}

Write-Host "✅ Environment files ready" -ForegroundColor Green
Write-Host ""

# Ask user for development mode
Write-Host "Choose development mode:" -ForegroundColor Cyan
Write-Host "1) Full AWS integration (requires AWS setup)" -ForegroundColor White
Write-Host "2) Mock API mode (frontend only, no AWS needed)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host "🔗 Using full AWS integration" -ForegroundColor Green
        # Update frontend to use real API
        (Get-Content ".env.local") -replace "NEXT_PUBLIC_USE_MOCK_API=true", "NEXT_PUBLIC_USE_MOCK_API=false" | Set-Content ".env.local"
        Write-Host "📡 Starting backend API server..." -ForegroundColor Blue
        
        # Start backend in new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\api'; npx nodemon index.js"
        Start-Sleep 3
    }
    "2" {
        Write-Host "🎭 Using mock API mode" -ForegroundColor Magenta
        # Update frontend to use mock API
        (Get-Content ".env.local") -replace "NEXT_PUBLIC_USE_MOCK_API=false", "NEXT_PUBLIC_USE_MOCK_API=true" | Set-Content ".env.local"
        Write-Host "✅ Mock mode enabled - no backend needed" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🌐 Starting frontend development server..." -ForegroundColor Blue

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "🎉 Development servers started!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
if ($choice -eq "1") {
    Write-Host "🔧 Backend API: http://localhost:3001" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Development servers are running in separate windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the servers." -ForegroundColor Yellow

# Keep script window open
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 
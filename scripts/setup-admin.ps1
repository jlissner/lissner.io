# Lissner Family Website - Initial Admin Setup Script (PowerShell)
# This script creates the first admin user directly in the users table

param(
    [string]$Email = "",
    [string]$Stage = "dev",
    [string]$Region = $env:AWS_DEFAULT_REGION
)

# Set default region if not provided
if (-not $Region) { $Region = "us-east-1" }

# Color functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $colorMap = @{
        "Red" = "Red"
        "Green" = "Green"
        "Yellow" = "Yellow"
        "Blue" = "Cyan"
        "White" = "White"
    }
    
    Write-Host $Message -ForegroundColor $colorMap[$Color]
}

Write-ColorOutput "🚀 Lissner Family Website - Admin Setup" "Blue"
Write-ColorOutput "========================================" "Blue"
Write-Host ""

# Check if AWS CLI is installed
try {
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "❌ AWS CLI is not installed. Please install it first." "Red"
        Write-ColorOutput "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" "Yellow"
        exit 1
    }

    # Check if AWS is configured
    $callerIdentity = aws sts get-caller-identity 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ AWS CLI is not configured. Please run 'aws configure' first." "Red"
        exit 1
    }

    Write-ColorOutput "✅ AWS CLI is configured" "Green"
    Write-Host ""
}
catch {
    Write-ColorOutput "❌ Error checking AWS CLI: $_" "Red"
    exit 1
}

# Get environment stage if not provided
if (-not $Stage) {
    $Stage = Read-Host "Enter your deployment stage (default: dev)"
    if (-not $Stage) { $Stage = "dev" }
}

# Get admin email if not provided
while (-not $Email -or $Email -notmatch "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") {
    if ($Email) {
        Write-ColorOutput "❌ Please enter a valid email address" "Red"
    }
    $Email = Read-Host "Enter your email address (this will be the admin)"
}

# Table name
$UsersTable = "lissner-users-$Stage"

Write-Host ""
Write-ColorOutput "📝 Configuration:" "Blue"
Write-Host "   Stage: $Stage"
Write-Host "   Region: $Region"
Write-Host "   Admin Email: $Email"
Write-Host "   Users Table: $UsersTable"
Write-Host ""

# Confirm
$confirm = Read-Host "Is this correct? [y/N]"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-ColorOutput "❌ Setup cancelled" "Red"
    exit 1
}

Write-Host ""
Write-ColorOutput "🔍 Checking if DynamoDB table exists..." "Yellow"

# Check if the DynamoDB table exists
try {
    aws dynamodb describe-table --table-name $UsersTable --region $Region 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ DynamoDB table '$UsersTable' does not exist!" "Red"
        Write-ColorOutput "   Please run the setup-aws-resources script first:" "Yellow"
        Write-ColorOutput "   .\scripts\setup-aws-resources.ps1" "Yellow"
        exit 1
    }
    Write-ColorOutput "✅ DynamoDB table found" "Green"
}
catch {
    Write-ColorOutput "❌ Error checking DynamoDB table: $_" "Red"
    exit 1
}

Write-ColorOutput "🔍 Checking if user already exists..." "Yellow"

try {
    # Check if user already exists
    $queryValues = "{`":email`": {`"S`": `"$Email`"}}"
    
    [System.IO.File]::WriteAllText("$env:TEMP\query-values.json", $queryValues)
    $existingUserQuery = aws dynamodb query --table-name $UsersTable --index-name EmailIndex --key-condition-expression "email = :email" --expression-attribute-values file://$env:TEMP/query-values.json --region $Region --output json 2>$null
    Remove-Item "$env:TEMP\query-values.json"
    
    if ($LASTEXITCODE -eq 0) {
        $existingUser = $existingUserQuery | ConvertFrom-Json
        $userExists = $existingUser.Items.Count -gt 0
    }
    else {
        $userExists = $false
    }

    if ($userExists) {
        Write-ColorOutput "⚠️  User already exists. Making them admin..." "Yellow"
        
        # Get the user ID
        $userId = $existingUser.Items[0].id.S
        
        # Update user to be admin
        $keyJson = "{`"id`": {`"S`": `"$userId`"}}"
        
        $updateValues = "{`":admin`": {`"BOOL`": true}}"
        
        [System.IO.File]::WriteAllText("$env:TEMP\update-key.json", $keyJson)
        [System.IO.File]::WriteAllText("$env:TEMP\update-values.json", $updateValues)
        aws dynamodb update-item --table-name $UsersTable --key file://$env:TEMP/update-key.json --update-expression "SET isAdmin = :admin" --expression-attribute-values file://$env:TEMP/update-values.json --region $Region
        Remove-Item "$env:TEMP\update-key.json"
        Remove-Item "$env:TEMP\update-values.json"
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Existing user updated to admin successfully" "Green"
        }
        else {
            throw "Failed to update user to admin"
        }
    }
    else {
        Write-ColorOutput "🔄 Creating new admin user..." "Yellow"
        
        # Generate UUID for user ID
        $userId = [System.Guid]::NewGuid().ToString()
        $currentTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        
        # Create new admin user
        $userItemJson = "{`"id`": {`"S`": `"$userId`"}, `"email`": {`"S`": `"$Email`"}, `"isAdmin`": {`"BOOL`": true}, `"createdAt`": {`"S`": `"$currentTime`"}, `"addedBy`": {`"S`": `"system`"}}"
        
        [System.IO.File]::WriteAllText("$env:TEMP\user-item.json", $userItemJson)
        aws dynamodb put-item --table-name $UsersTable --item file://$env:TEMP/user-item.json --region $Region
        Remove-Item "$env:TEMP\user-item.json"
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Admin user created successfully" "Green"
        }
        else {
            throw "Failed to create admin user"
        }
    }

    Write-Host ""
    Write-ColorOutput "🎉 Setup Complete!" "Green"
    Write-Host ""
    Write-ColorOutput "📋 Admin User Details:" "Blue"
    Write-Host "   Email: $Email"
    Write-Host "   ID: $userId"
    Write-Host "   Admin: Yes"
    Write-Host ""
    Write-ColorOutput "📝 Next Steps:" "Blue"
    Write-Host "1. Visit your website and log in with $Email"
    Write-Host "2. Check your email for the magic link"
    Write-Host "3. You should now have access to the admin panel"
    Write-Host "4. Use the admin panel to add other family members"
    Write-Host ""
    Write-ColorOutput "🔧 If you need to add more admins later, use:" "Blue"
    Write-Host "   .\scripts\make-admin.ps1 -Email another-email@domain.com"
    Write-Host ""
    Write-ColorOutput "📖 For more help, see the README.md and deployment-checklist.md files" "Blue"
}
catch {
    Write-ColorOutput "❌ Error during setup: $_" "Red"
    exit 1
} 
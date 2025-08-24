# AWS Resources Setup Script for Lissner Family Website (PowerShell)
# This script creates all necessary AWS resources that don't already exist

param(
    [string]$Stage = $env:STAGE,
    [string]$Region = $env:AWS_DEFAULT_REGION,
    [string]$S3Bucket = $env:AWS_S3_BUCKET,
    [string]$SESEmail = $env:AWS_SES_FROM_EMAIL
)

# Set default values if not provided - updated for consistency with serverless.yml
if (-not $Stage) { $Stage = "dev" }
if (-not $Region) { $Region = "us-east-1" }

# Validate required environment variables
if (-not $S3Bucket) {
    Write-ColorOutput "[ERROR] AWS_S3_BUCKET environment variable is required" "Red"
    Write-ColorOutput "[INFO] Example: `$env:AWS_S3_BUCKET='your-unique-bucket-name'" "Yellow"
    exit 1
}

if (-not $SESEmail) {
    Write-ColorOutput "[WARN] AWS_SES_FROM_EMAIL not set. Email functionality will be skipped." "Yellow"
}

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

Write-ColorOutput "=== Lissner Family Website - AWS Resources Setup ===" "Blue"
Write-Host ""
Write-Host "Stage: $Stage"
Write-Host "Region: $Region"
Write-Host "S3 Bucket: $S3Bucket"
Write-Host "SES Email: $SESEmail"
Write-Host ""

# Confirm configuration
$confirm = Read-Host "Is this correct? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-ColorOutput "[ERROR] Setup cancelled" "Red"
    exit 1
}

# Function to check if AWS CLI is configured
function Test-AWSCLIConfiguration {
    try {
        if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
            Write-ColorOutput "[ERROR] AWS CLI is not installed. Please install it first." "Red"
            exit 1
        }

        $callerIdentity = aws sts get-caller-identity 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "[ERROR] AWS CLI is not configured. Please run 'aws configure' first." "Red"
            exit 1
        }

        Write-ColorOutput "[OK] AWS CLI is configured" "Green"
        return $true
    }
    catch {
        Write-ColorOutput "[ERROR] Error checking AWS CLI configuration: $_" "Red"
        exit 1
    }
}

# Function to create S3 bucket and configure it
function New-S3BucketIfNotExists {
    Write-ColorOutput "[INFO] Checking S3 bucket: $S3Bucket" "Yellow"
    
    $bucketExists = $false
    try {
        $bucketExists = aws s3api head-bucket --bucket $S3Bucket 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "[OK] S3 bucket already exists" "Green"
            $bucketExists = $true
        }
    }
    catch {
        # Bucket doesn't exist, continue to create it
    }
    
    if (-not $bucketExists) {
        Write-ColorOutput "[INFO] Creating S3 bucket..." "Yellow"
        
        try {
            # Use 's3 mb' which automatically handles LocationConstraint
            aws s3 mb s3://$S3Bucket --region $Region
            
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create S3 bucket"
            }
            
            Write-ColorOutput "[OK] S3 bucket created successfully" "Green"
        }
        catch {
            Write-ColorOutput "[ERROR] Error creating S3 bucket: $_" "Red"
            exit 1
        }
    }
    
    # Configure bucket policy and CORS (whether bucket is new or existing)
    Write-ColorOutput "[INFO] Configuring S3 bucket policy and CORS..." "Yellow"
    
    try {
        # First, disable Block Public Access settings to allow public bucket policy
        Write-ColorOutput "[INFO] Configuring Block Public Access settings..." "Yellow"
        
        $blockPublicAccessConfig = @"
{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
}
"@
        
        [System.IO.File]::WriteAllText("$env:TEMP\block-public-access.json", $blockPublicAccessConfig)
        aws s3api put-public-access-block --bucket $S3Bucket --public-access-block-configuration file://$env:TEMP/block-public-access.json
        Remove-Item "$env:TEMP\block-public-access.json"
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to configure Block Public Access settings"
        }
        
        # Set bucket policy for public read access to photos
        Write-ColorOutput "[INFO] Applying bucket policy..." "Yellow"
        $bucketPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$S3Bucket/*"
        }
    ]
}
"@
        
        [System.IO.File]::WriteAllText("$env:TEMP\bucket-policy.json", $bucketPolicy)
        aws s3api put-bucket-policy --bucket $S3Bucket --policy file://$env:TEMP/bucket-policy.json
        Remove-Item "$env:TEMP\bucket-policy.json"
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to set bucket policy"
        }
        
        # Enable CORS
        $corsConfig = @"
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
"@
        
        [System.IO.File]::WriteAllText("$env:TEMP\cors-config.json", $corsConfig)
        aws s3api put-bucket-cors --bucket $S3Bucket --cors-configuration file://$env:TEMP/cors-config.json
        Remove-Item "$env:TEMP\cors-config.json"
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to set CORS configuration"
        }
        
        Write-ColorOutput "[OK] S3 bucket configured successfully" "Green"
    }
    catch {
        Write-ColorOutput "[ERROR] Error configuring S3 bucket: $_" "Red"
        exit 1
    }
}

# Function to create DynamoDB table
function New-DynamoDBTableIfNotExists {
    param(
        [string]$TableName,
        [string]$KeySchema,
        [string]$AttributeDefinitions,
        [string]$GSIConfig = ""
    )
    
    Write-ColorOutput "[INFO] Checking DynamoDB table: $TableName" "Yellow"
    
    try {
        $tableExists = aws dynamodb describe-table --table-name $TableName --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "[OK] Table $TableName already exists" "Green"
            return
        }
    }
    catch {
        # Table doesn't exist, continue to create it
    }
    
    Write-ColorOutput "[INFO] Creating DynamoDB table: $TableName" "Yellow"
    
    try {
        if ($GSIConfig) {
            # Write GSI config to temp file to avoid JSON escaping issues
            [System.IO.File]::WriteAllText("$env:TEMP\gsi-config.json", $GSIConfig)
            $createCmd = "aws dynamodb create-table --table-name $TableName --region $Region --key-schema $KeySchema --attribute-definitions $AttributeDefinitions --billing-mode PAY_PER_REQUEST --global-secondary-indexes file://$env:TEMP/gsi-config.json"
        } else {
            $createCmd = "aws dynamodb create-table --table-name $TableName --region $Region --key-schema $KeySchema --attribute-definitions $AttributeDefinitions --billing-mode PAY_PER_REQUEST"
        }
        
        Invoke-Expression $createCmd
        
        # Clean up temp file if it was created
        if ($GSIConfig -and (Test-Path "$env:TEMP\gsi-config.json")) {
            Remove-Item "$env:TEMP\gsi-config.json"
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create table"
        }
        
        Write-ColorOutput "[INFO] Waiting for table to become active..." "Yellow"
        aws dynamodb wait table-exists --table-name $TableName --region $Region
        
        Write-ColorOutput "[OK] Table $TableName created successfully" "Green"
    }
    catch {
        Write-ColorOutput "[ERROR] Error creating table $TableName : $_" "Red"
        exit 1
    }
}

# Function to update existing GSI if needed
function Update-PhotosTableGSI {
    param(
        [string]$TableName
    )
    
    Write-ColorOutput "[INFO] Checking Photos table GSI configuration..." "Yellow"
    
    try {
        # Get current table description
        $tableDescription = aws dynamodb describe-table --table-name $TableName --region $Region --output json | ConvertFrom-Json
        
        if ($tableDescription.Table.GlobalSecondaryIndexes) {
            $uploadedAtIndex = $tableDescription.Table.GlobalSecondaryIndexes | Where-Object { $_.IndexName -eq "UploadedAtIndex" }
            
            if ($uploadedAtIndex) {
                # Check if GSI has the old structure (uploadedAt as partition key)
                $hasOldStructure = $uploadedAtIndex.KeySchema | Where-Object { $_.AttributeName -eq "uploadedAt" -and $_.KeyType -eq "HASH" }
                
                if ($hasOldStructure) {
                    Write-ColorOutput "[INFO] Found old GSI structure. Updating to new structure..." "Yellow"
                    
                    # Delete the old GSI
                    Write-ColorOutput "[INFO] Deleting old GSI..." "Yellow"
                    
                    $deleteGSIConfig = @'
[
    {
        "Delete": {
            "IndexName": "UploadedAtIndex"
        }
    }
]
'@
                    
                    [System.IO.File]::WriteAllText("$env:TEMP\delete-gsi-config.json", $deleteGSIConfig)
                    aws dynamodb update-table --table-name $TableName --region $Region --global-secondary-index-updates file://$env:TEMP/delete-gsi-config.json
                    Remove-Item "$env:TEMP\delete-gsi-config.json"
                    
                    if ($LASTEXITCODE -ne 0) {
                        throw "Failed to delete old GSI"
                    }
                    
                    # Wait for GSI to be deleted
                    Write-ColorOutput "[INFO] Waiting for GSI deletion to complete..." "Yellow"
                    do {
                        Start-Sleep -Seconds 10
                        $tableDescription = aws dynamodb describe-table --table-name $TableName --region $Region --output json | ConvertFrom-Json
                        $gsiExists = $tableDescription.Table.GlobalSecondaryIndexes | Where-Object { $_.IndexName -eq "UploadedAtIndex" }
                    } while ($gsiExists)
                    
                    Write-ColorOutput "[INFO] Old GSI deleted successfully" "Green"
                    
                    # Add photoType attribute to table if it doesn't exist
                    Write-ColorOutput "[INFO] Adding photoType attribute definition..." "Yellow"
                    try {
                        $attributeConfig = @'
[
    {"AttributeName": "id", "AttributeType": "S"},
    {"AttributeName": "uploadedAt", "AttributeType": "S"},
    {"AttributeName": "photoType", "AttributeType": "S"}
]
'@
                        [System.IO.File]::WriteAllText("$env:TEMP\attribute-config.json", $attributeConfig)
                        aws dynamodb update-table --table-name $TableName --region $Region --attribute-definitions file://$env:TEMP/attribute-config.json 2>$null
                        Remove-Item "$env:TEMP\attribute-config.json"
                        # This might fail if attribute already exists, which is fine
                    } catch {
                        # Ignore error if attribute already exists
                    }
                    
                    # Create new GSI with correct structure
                    Write-ColorOutput "[INFO] Creating new GSI with correct structure..." "Yellow"
                    
                    $newGSIConfig = @'
[
    {
        "Create": {
            "IndexName": "UploadedAtIndex",
            "KeySchema": [
                {"AttributeName": "photoType", "KeyType": "HASH"},
                {"AttributeName": "uploadedAt", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"}
        }
    }
]
'@
                    
                    [System.IO.File]::WriteAllText("$env:TEMP\new-gsi-config.json", $newGSIConfig)
                    
                    $newAttributeConfig = @'
[
    {"AttributeName": "id", "AttributeType": "S"},
    {"AttributeName": "uploadedAt", "AttributeType": "S"},
    {"AttributeName": "photoType", "AttributeType": "S"}
]
'@
                    [System.IO.File]::WriteAllText("$env:TEMP\new-attribute-config.json", $newAttributeConfig)
                    aws dynamodb update-table --table-name $TableName --region $Region --attribute-definitions file://$env:TEMP/new-attribute-config.json --global-secondary-index-updates file://$env:TEMP/new-gsi-config.json
                    Remove-Item "$env:TEMP\new-gsi-config.json"
                    Remove-Item "$env:TEMP\new-attribute-config.json"
                    
                    if ($LASTEXITCODE -ne 0) {
                        throw "Failed to create new GSI"
                    }
                    
                    # Wait for GSI to be created
                    Write-ColorOutput "[INFO] Waiting for new GSI to become active..." "Yellow"
                    do {
                        Start-Sleep -Seconds 10
                        $tableDescription = aws dynamodb describe-table --table-name $TableName --region $Region --output json | ConvertFrom-Json
                        $gsiStatus = $tableDescription.Table.GlobalSecondaryIndexes | Where-Object { $_.IndexName -eq "UploadedAtIndex" } | Select-Object -ExpandProperty IndexStatus
                    } while ($gsiStatus -ne "ACTIVE")
                    
                    Write-ColorOutput "[OK] GSI updated successfully with new structure" "Green"
                } else {
                    Write-ColorOutput "[OK] GSI already has correct structure" "Green"
                }
            }
        }
    }
    catch {
        Write-ColorOutput "[ERROR] Error updating GSI: $_" "Red"
        exit 1
    }
}

# Function to create all DynamoDB tables
function New-DynamoDBTables {
    Write-ColorOutput "[INFO] Setting up DynamoDB tables..." "Blue"
    
    # Users table
    New-DynamoDBTableIfNotExists -TableName "lissner-users-$Stage" -KeySchema "AttributeName=id,KeyType=HASH" -AttributeDefinitions "AttributeName=id,AttributeType=S AttributeName=email,AttributeType=S" -GSIConfig '[{"IndexName": "EmailIndex", "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}}]'
    
    # Photos table - Updated with correct GSI structure
    New-DynamoDBTableIfNotExists -TableName "lissner-photos-$Stage" -KeySchema "AttributeName=id,KeyType=HASH" -AttributeDefinitions "AttributeName=id,AttributeType=S AttributeName=uploadedAt,AttributeType=S AttributeName=photoType,AttributeType=S" -GSIConfig '[{"IndexName": "UploadedAtIndex", "KeySchema": [{"AttributeName": "photoType", "KeyType": "HASH"}, {"AttributeName": "uploadedAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}]'
    
    # Check and update existing Photos table GSI if needed
    Update-PhotosTableGSI -TableName "lissner-photos-$Stage"
    
    # Magic Links table
    New-DynamoDBTableIfNotExists -TableName "lissner-magic-links-$Stage" -KeySchema "AttributeName=token,KeyType=HASH" -AttributeDefinitions "AttributeName=token,AttributeType=S"
    
    # Add TTL to magic links table
    Write-ColorOutput "[INFO] Setting up TTL for magic links table..." "Yellow"
    try {
        aws dynamodb update-time-to-live --table-name "lissner-magic-links-$Stage" --region $Region --time-to-live-specification "Enabled=true,AttributeName=expiresAt" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "[WARN] TTL might already be configured" "Yellow"    
        }
    }
    catch {
        Write-ColorOutput "[WARN] TTL might already be configured" "Yellow"
    }
}

# Function to setup SES
function Initialize-SES {
    Write-ColorOutput "[INFO] Setting up SES (Simple Email Service)..." "Blue"
    
    if (-not $SESEmail) {
        Write-ColorOutput "[WARN] No SES email provided. Skipping SES setup." "Yellow"
        Write-ColorOutput "[INFO] Set AWS_SES_FROM_EMAIL environment variable to configure SES" "Yellow"
        return
    }
    
    Write-ColorOutput "[INFO] Verifying email: $SESEmail" "Yellow"
    
    try {
        # Check if email is already verified
        $verificationStatus = aws ses get-identity-verification-attributes --identities $SESEmail --region $Region --output json | ConvertFrom-Json
        
        if ($verificationStatus.VerificationAttributes.$SESEmail.VerificationStatus -eq "Success") {
            Write-ColorOutput "[OK] Email $SESEmail is already verified" "Green"
        }
        else {
            Write-ColorOutput "[INFO] Requesting email verification..." "Yellow"
            aws ses verify-email-identity --email-address $SESEmail --region $Region
            
            Write-ColorOutput "[INFO] Verification email sent to $SESEmail" "Yellow"
            Write-ColorOutput "[INFO] Please check your email and click the verification link" "Yellow"
            Write-ColorOutput "[INFO] You can check verification status with:" "Yellow"
            Write-ColorOutput "   aws ses get-identity-verification-attributes --identities $SESEmail --region $Region" "Yellow"
        }
        
        # Check if we're in sandbox mode
        Write-ColorOutput "[INFO] Checking SES sandbox status..." "Yellow"
        $sendQuota = aws ses get-send-quota --region $Region --output text --query 'Max24HourSend'
        
        if ($sendQuota -eq "200.0") {
            Write-ColorOutput "[WARN] SES is in sandbox mode (can only send to verified emails)" "Yellow"
            Write-ColorOutput "[INFO] For production use, request to exit sandbox mode in SES console" "Yellow"
        }
        else {
            Write-ColorOutput "[OK] SES is in production mode" "Green"
        }
    }
    catch {
        Write-ColorOutput "[WARN] Error setting up SES: $_" "Yellow"
    }
}

# Function to display summary
function Show-Summary {
    Write-Host ""
    Write-ColorOutput "=== AWS Resources Setup Complete! ===" "Green"
    Write-Host ""
    Write-ColorOutput "Resources Created/Verified:" "Blue"
    Write-Host "  S3 Bucket: $S3Bucket"
    Write-Host "  DynamoDB Tables:"
    Write-Host "     - lissner-users-$Stage"
    Write-Host "     - lissner-photos-$Stage"
    Write-Host "     - lissner-magic-links-$Stage"
    if ($SESEmail) {
        Write-Host "  SES Email: $SESEmail (verify in email if new)"
    }
    Write-Host ""
    Write-ColorOutput "Next Steps:" "Blue"
    Write-Host "  1. Update your environment files with these resource names"
    Write-Host "  2. Deploy your serverless backend: cd api && serverless deploy"
    Write-Host "  3. Create your first admin user: .\scripts\setup-admin.ps1 -Email your-email@domain.com"
    Write-Host "  4. Deploy your frontend (Vercel/Amplify/etc.)"
    Write-Host ""
    Write-ColorOutput "Environment Variables for API Deployment:" "Blue"
    Write-Host "  `$env:AWS_S3_BUCKET='$S3Bucket'"
    Write-Host "  `$env:AWS_DEFAULT_REGION='$Region'"
    if ($SESEmail) {
        Write-Host "  `$env:AWS_SES_FROM_EMAIL='$SESEmail'"
        Write-Host "  `$env:AWS_SES_REGION='$Region'"
    }
    Write-Host "  `$env:JWT_SECRET='your-secure-jwt-secret-here'"
    Write-Host "  `$env:FRONTEND_URL='https://your-frontend-domain.com'"
    Write-Host "  `$env:STAGE='$Stage'"
    Write-Host ""
    Write-ColorOutput "Additional Setup Required:" "Blue"
    Write-Host "  • Set JWT_SECRET to a secure random string"
    Write-Host "  • Update FRONTEND_URL to your actual frontend domain"
    if ($SESEmail) {
        Write-Host "  • Verify your SES email address before first deployment"
    }
    Write-Host ""
}

# Main execution
function Main {
    Write-ColorOutput "Starting AWS resources setup..." "Blue"
    Write-Host ""
    
    Test-AWSCLIConfiguration
    New-S3BucketIfNotExists
    New-DynamoDBTables
    Initialize-SES
    
    Show-Summary
}

# Run main function
try {
    Main
}
catch {
    Write-ColorOutput "[ERROR] Script failed: $_" "Red"
    exit 1
} 
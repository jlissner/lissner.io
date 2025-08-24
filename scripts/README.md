# Lissner Family Website - Scripts

This directory contains utility scripts for managing the family photo website.

## Setup Scripts

### `setup-aws-resources.sh` / `setup-aws-resources.ps1`
Sets up AWS resources (DynamoDB tables, S3 bucket, SES) needed for the application.

### `setup-admin.sh` / `setup-admin.ps1` / `setup-admin.js`
Creates the first admin user in the system.

### `make-admin.sh`
Promotes an existing user to admin status.

## Migration Scripts

### `migrate-photos.js`
**Purpose**: Adds the `photoType` field to existing photos to enable GSI-based sorting.

**When to run**: After updating the DynamoDB schema to include the new UploadedAtIndex GSI.

**Usage**:
```bash
cd api
node ../scripts/migrate-photos.js [stage]
```

**Examples**:
```bash
# Migrate photos in development environment
node ../scripts/migrate-photos.js dev

# Migrate photos in production environment
node ../scripts/migrate-photos.js prod
```

**What it does**:
1. Scans all photos that don't have a `photoType` field
2. Adds `photoType: 'PHOTO'` to each photo
3. Processes photos in batches of 25 to avoid overwhelming DynamoDB
4. Provides detailed progress logging
5. Shows a summary of updated photos

**Prerequisites**:
- AWS credentials configured
- DynamoDB permissions (Scan, UpdateItem)
- The target table must exist

**Safety features**:
- Only updates photos that don't already have `photoType`
- Uses conditional expressions to ensure photo exists
- Processes in small batches with delays
- Provides a 5-second countdown before starting
- Can be cancelled with Ctrl+C

## Development Scripts

### `dev-local.sh` / `dev-local.ps1`
Starts the local development environment with both frontend and backend.

### `cleanup-whitelist.sh`
Removes invalid email addresses from the whitelist.

## Usage Notes

- Most scripts require AWS CLI to be installed and configured
- Scripts are designed to be idempotent (safe to run multiple times)
- Always test in development environment first
- Check the script output for any errors or warnings

## Migration Workflow

When deploying GSI changes for photo sorting:

1. **Deploy schema changes**:
   ```bash
   cd api
   serverless deploy
   ```

2. **Run migration**:
   ```bash
   node ../scripts/migrate-photos.js dev
   ```

3. **Verify GSI is active** (in AWS Console):
   - Go to DynamoDB → Tables → lissner-photos-dev
   - Check that UploadedAtIndex shows "Active" status

4. **Test photo sorting**:
   - Upload a new photo
   - Verify it appears at the top of the feed
   - Check terminal logs for GSI query success

5. **Deploy to production** (if everything works):
   ```bash
   serverless deploy --stage prod
   node ../scripts/migrate-photos.js prod
   ``` 
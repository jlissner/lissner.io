# Lissner Family Website

A private family photo sharing website with magic link authentication, built with Next.js and serverless AWS architecture.

## Features

- **Magic Link Authentication**: Email-only login with secure magic links
- **Photo Upload & Management**: Upload, view, and organize family photos
- **Social Features**: Comments, reactions (like, love, laugh), and tags
- **Admin Controls**: Email whitelist management and user administration
- **Mobile Responsive**: Beautiful UI that works on all devices

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js/Express running on AWS Lambda
- **Database**: DynamoDB (serverless, pay-per-use)
- **Storage**: AWS S3 for photos
- **Email**: AWS SES for magic links
- **Deployment**: Serverless Framework

## Cost-Effective AWS Design

This application is designed to minimize AWS costs:
- **DynamoDB**: Pay-per-request billing (very cheap for family usage)
- **Lambda**: Only pay when users access the site
- **S3**: Minimal storage costs for photos
- **SES**: Very cheap email sending
- **CloudFront**: Optional CDN for faster image loading

**Estimated monthly cost for a family of 10-20 users: $5-15/month**

## Quick Start

### Prerequisites

1. AWS Account with programmatic access
2. Node.js 18+ and npm
3. Serverless Framework CLI

### 1. Clone and Setup

```bash
git clone <your-repo>
cd lissner-family-website

# Install frontend dependencies
npm install

# Install backend dependencies
cd api
npm install
cd ..
```

### 2. AWS Setup

#### Option A: Automated Setup (Recommended)

Run the AWS resource setup script to create all necessary resources:

```bash
# For Linux/Mac
export AWS_S3_BUCKET=your-bucket-name
export AWS_SES_FROM_EMAIL=noreply@yourdomain.com
bash scripts/setup-aws-resources.sh

# For Windows PowerShell
$env:AWS_S3_BUCKET="your-bucket-name"
$env:AWS_SES_FROM_EMAIL="noreply@yourdomain.com"
.\scripts\setup-aws-resources.ps1
```

This script will automatically:
- Create S3 bucket with proper permissions
- Create all DynamoDB tables with indexes
- Set up SES email verification
- Configure all necessary AWS resources

#### Option B: Manual Setup

If you prefer manual setup:

#### Create S3 Bucket
```bash
aws s3 mb s3://lissner-family-photos-bucket --region us-east-1
```

#### Setup SES (Simple Email Service)
1. Go to AWS SES Console
2. Verify your sender email address
3. If in sandbox mode, verify recipient emails too
4. For production, request to exit sandbox mode

#### Create Environment Files

Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://your-api-gateway-url.amazonaws.com/dev
```

Backend `api/.env`:
```bash
JWT_SECRET=your-super-secret-jwt-key-here
AWS_DEFAULT_REGION=us-east-1
AWS_S3_BUCKET=lissner-family-photos-bucket
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@your-domain.com
FRONTEND_URL=https://your-frontend-domain.com
STAGE=dev
```

### 3. Deploy Backend

```bash
cd api
npm install -g serverless
serverless deploy
```

This will create:
- Lambda function for the API
- API Gateway endpoint
- DynamoDB tables
- IAM roles and policies

Note the API Gateway URL from the output.

### 4. Setup Initial Admin

Use the provided script to create your first admin user:

```bash
# Linux/Mac
bash scripts/setup-admin.sh

# Windows PowerShell
.\scripts\setup-admin.ps1 -Email your-email@example.com

# Or use the make-admin script if you prefer to specify email directly
bash scripts/make-admin.sh your-email@example.com
```

This creates a user record and makes them an admin, allowing them to manage other family members through the admin panel.

### 5. Deploy Frontend

#### Option A: Vercel (Recommended)
1. Connect your GitHub repo to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL`
3. Deploy automatically

#### Option B: AWS Amplify
1. Go to AWS Amplify Console
2. Connect your GitHub repo
3. Set environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy

#### Option C: Self-hosted
```bash
npm run build
npm start
```

## Local Development

```bash
npm run dev
```

## Environment Variables

### Frontend
- `NEXT_PUBLIC_API_URL`: Your API Gateway endpoint URL

### Backend
- `JWT_SECRET`: Secret key for JWT tokens (generate a strong random string)
- `AWS_S3_BUCKET`: Your S3 bucket name
- `AWS_SES_FROM_EMAIL`: Verified sender email in SES
- `FRONTEND_URL`: Your frontend domain (for magic link emails)

## AWS Resources Created

### DynamoDB Tables
- `lissner-users-{stage}`: User accounts and profiles (also serves as the family member whitelist)
- `lissner-photos-{stage}`: Photo metadata, comments, reactions, tags
- `lissner-magic-links-{stage}`: Temporary magic link tokens

### S3 Bucket
- Store uploaded photos
- Public read access for family members

### Lambda Function
- Serverless API backend
- Auto-scaling based on usage

### API Gateway
- REST API endpoints
- CORS configured for frontend

## Security Features

- **Family Member Management**: Only users added by admins can access
- **Magic Link Authentication**: No passwords to remember or compromise
- **JWT Tokens**: Secure session management
- **Admin Controls**: Granular user and access management
- **HTTPS Everywhere**: All communications encrypted

## API Endpoints

### Authentication
- `POST /auth/magic-link` - Send magic link to email
- `POST /auth/verify` - Verify magic link token
- `GET /auth/me` - Get current user info

### Photos
- `GET /photos` - List photos with pagination
- `POST /photos/upload` - Upload new photo
- `POST /photos/:id/comments` - Add comment
- `POST /photos/:id/reactions` - Add/update reaction
- `DELETE /photos/:id/reactions` - Remove reaction
- `POST /photos/:id/tags` - Add tag

### Admin
- `GET /admin/users` - Get all users
- `POST /admin/users` - Add new family member
- `DELETE /admin/users/:id` - Remove family member
- `PATCH /admin/users/:id` - Update user admin status

## Troubleshooting

### Common Issues

1. **Magic links not sending**
   - Check SES setup and verified email addresses
   - Ensure SES is not in sandbox mode for production

2. **Photos not uploading**
   - Check S3 bucket permissions
   - Verify Lambda has S3 write permissions

3. **Database errors**
   - Ensure DynamoDB tables exist
   - Check Lambda IAM permissions

4. **CORS errors**
   - Update API Gateway CORS settings
   - Check frontend/backend URL configuration

### Costs Monitoring

Monitor your AWS costs:
- Set up AWS Budgets alerts
- Check DynamoDB and S3 usage regularly
- Consider implementing photo size limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

Private family use only. 
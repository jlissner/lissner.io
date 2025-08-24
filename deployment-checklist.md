# 🚀 Lissner Family Website Deployment Checklist

Follow this checklist step-by-step to deploy your family photo website.

## ✅ Prerequisites Setup

- [ ] AWS Account created and CLI configured
- [ ] Node.js 18+ installed
- [ ] Git repository created (GitHub, GitLab, etc.)

## ✅ AWS Services Setup

### Option A: Automated Setup (Recommended)
- [ ] Run the AWS resource setup script:
  ```bash
  # For Linux/Mac
  bash scripts/setup-aws-resources.sh
  
  # For Windows PowerShell
  .\scripts\setup-aws-resources.ps1
  ```
- [ ] Set environment variables before running (optional):
  ```bash
  export AWS_S3_BUCKET=your-bucket-name
  export AWS_SES_FROM_EMAIL=noreply@yourdomain.com
  export AWS_DEFAULT_REGION=us-east-1
  ```

### Option B: Manual Setup

#### 1. S3 Bucket
- [x] Create S3 bucket: `lissner-family-photos-bucket` (or your preferred name)
  ```bash
  aws s3 mb s3://lissner-family-photos-bucket --region us-east-1
  ```
- [x] Note down the bucket name for environment variables
  - lissner-family-photos-bucket

#### 2. SES (Simple Email Service)
- [x] Go to AWS SES Console
- [x] Verify sender email address (e.g., `noreply@yourdomain.com`)
- [x] If in sandbox mode, verify family member emails OR request production access
- [x] Note down the verified sender email
  - noreply@lissner.io

#### 3. Domain (Optional but Recommended)
- [x] Register domain or use existing one
- [x] Set up Route 53 hosted zone (if using AWS)
- [x] Configure SSL certificate in ACM

## ✅ Code Setup

### 1. Clone and Install
- [x] Clone this repository to your local machine
- [x] Install frontend dependencies: `npm install`
- [x] Install backend dependencies: `cd api && npm install`

### 2. Environment Configuration

#### Backend Environment (`api/.env`):
- [x] Copy `api/.env.example` to `api/.env`
- [x] Set `JWT_SECRET` (generate random 64-character string)
- [x] Set `AWS_S3_BUCKET` (your bucket name)
- [x] Set `AWS_SES_FROM_EMAIL` (your verified sender email)
- [x] Set `FRONTEND_URL` (will be set after frontend deployment)

#### Frontend Environment (`.env.local`):
- [x] Will be set after backend deployment

## ✅ Backend Deployment

### 1. Deploy Serverless API
- [ ] Install Serverless CLI: `npm install -g serverless`
- [ ] Deploy: `cd api && serverless deploy`
- [ ] Note the API Gateway URL from output
- [ ] Update `FRONTEND_URL` in backend environment with your planned frontend URL

### 2. Set Up First Admin User
- [ ] Use the setup script:
  ```bash
  # Linux/Mac
  bash scripts/setup-admin.sh
  
  # Windows PowerShell
  .\scripts\setup-admin.ps1 -Email your-email@example.com
  ```

## ✅ Frontend Deployment

Choose one deployment method:

### Option A: Vercel (Recommended - Free)
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variable: `NEXT_PUBLIC_API_URL` (from backend deployment)
- [ ] Deploy automatically on git push
- [ ] Note the Vercel URL

### Option B: AWS Amplify
- [ ] Create new app in AWS Amplify Console
- [ ] Connect GitHub repository
- [ ] Set environment variable: `NEXT_PUBLIC_API_URL`
- [ ] Deploy
- [ ] Note the Amplify URL

## ✅ Final Configuration

### 1. Update Backend with Frontend URL
- [ ] Update backend environment variable `FRONTEND_URL` with actual frontend URL
- [ ] Redeploy backend: `cd api && serverless deploy`

### 2. Test First Admin Login
- [ ] Visit your frontend URL
- [ ] Try to log in with your admin email (set up in step 2 above)
- [ ] Check email for magic link and log in
- [ ] Verify admin panel access works

### 3. Test Everything
- [ ] Log in successfully
- [ ] Upload a test photo
- [ ] Add comment and reaction
- [ ] Access admin panel
- [ ] Add family members to whitelist
- [ ] Test family member login

## ✅ Security & Monitoring

### 1. AWS Security
- [ ] Review IAM policies (principle of least privilege)
- [ ] Enable CloudTrail for API logging
- [ ] Set up AWS Config for compliance monitoring

### 2. Cost Monitoring
- [ ] Set up AWS Budgets with alerts
- [ ] Enable Cost Explorer
- [ ] Monitor DynamoDB, S3, and Lambda usage

### 3. Backup Strategy
- [ ] Enable DynamoDB point-in-time recovery
- [ ] Set up S3 versioning for photos
- [ ] Create backup/restore procedures

## ✅ Family Onboarding

### 1. Add Family Members
- [ ] Use admin panel "Family Members" section to add users
- [ ] Set admin privileges for trusted family members if desired
- [ ] Send them the website URL
- [ ] Help them with first login if needed

### 2. Set Usage Guidelines
- [ ] Photo upload guidelines (size, content)
- [ ] Community guidelines for comments
- [ ] Privacy reminders

## 🎉 Launch Complete!

Congratulations! Your family photo website is now live.

## 📞 Need Help?

### Common Issues:
1. **Magic links not working**: Check SES configuration
2. **Photos not uploading**: Verify S3 permissions
3. **Database errors**: Check DynamoDB table creation
4. **CORS issues**: Verify frontend/backend URLs

### Support:
- Check the README.md for detailed troubleshooting
- Review AWS CloudWatch logs for errors
- Test each component individually

## 🔄 Maintenance Tasks

### Monthly:
- [ ] Review AWS costs
- [ ] Check for security updates
- [ ] Monitor storage usage

### As Needed:
- [ ] Add new family members through admin panel
- [ ] Update user admin privileges
- [ ] Review and moderate content

## ⚠️ Upgrading from Whitelist Version

If you previously deployed with the separate whitelist table (before this update):

### 1. Clean Up Old Table
- [ ] Run cleanup script: `bash scripts/cleanup-whitelist.sh dev`
- [ ] This will show you existing whitelist emails before deletion

### 2. Migrate Users
- [ ] Manually add family members through the admin panel
- [ ] Or use `scripts/setup-admin.sh` to create admin users
- [ ] All family members must be added as user records to log in

### 3. Update Instructions
- [ ] The whitelist is now managed through the "Family Members" section in admin
- [ ] Users are created directly instead of being added to a separate whitelist 
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lissner-family-photos-bucket.s3.amazonaws.com'], // S3 bucket for family photos
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig 
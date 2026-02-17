#!/bin/bash

# Deployment script for InvoiceFlow
# This ensures cache is cleared on every deployment

echo "🚀 Starting InvoiceFlow Deployment..."

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Version is now incremented automatically by 'npm run build' via prebuild script
echo "Version management is handled by scripts/bump_version.js during build."

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Vercel (or your hosting platform)
echo "🌐 Deploying to production..."
vercel --prod

echo "✨ Deployment complete!"
echo "🔄 Users will auto-refresh to version $NEW_VERSION"

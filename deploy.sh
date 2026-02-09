#!/bin/bash

# Deployment script for InvoiceFlow
# This ensures cache is cleared on every deployment

echo "🚀 Starting InvoiceFlow Deployment..."

# Increment version number
CURRENT_VERSION=$(grep "NEXT_PUBLIC_APP_VERSION" .env.local | cut -d '=' -f2)
echo "Current version: $CURRENT_VERSION"

# Update version (increment patch version)
NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
echo "New version: $NEW_VERSION"

# Update .env.local
sed -i "s/NEXT_PUBLIC_APP_VERSION=.*/NEXT_PUBLIC_APP_VERSION=$NEW_VERSION/" .env.local

echo "✅ Version updated to $NEW_VERSION"

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Vercel (or your hosting platform)
echo "🌐 Deploying to production..."
vercel --prod

echo "✨ Deployment complete!"
echo "🔄 Users will auto-refresh to version $NEW_VERSION"

#!/bin/bash

# Quick Vercel Deployment Script for ADV Mission Control Frontend
# This script helps you deploy the frontend to Vercel

echo "🚀 ADV Mission Control - Vercel Deployment Script"
echo "=================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found."
    echo "🔧 Installing Vercel CLI locally for this project..."
    
    # Try to install locally first
    if npm install vercel --save-dev; then
        echo "✅ Vercel CLI installed locally"
        # Use npx to run the local version
        VERCEL_CMD="npx vercel"
    else
        echo ""
        echo "❌ Failed to install Vercel CLI locally."
        echo "📋 Please install manually using one of these methods:"
        echo ""
        echo "Method 1 - Install globally with sudo:"
        echo "  sudo npm install -g vercel"
        echo ""
        echo "Method 2 - Install locally in project:"
        echo "  npm install vercel --save-dev"
        echo "  npx vercel --version"
        echo ""
        echo "Method 3 - Use npm without global install:"
        echo "  npx vercel@latest"
        echo ""
        echo "After installation, run this script again or use 'npx vercel' directly."
        exit 1
    fi
else
    VERCEL_CMD="vercel"
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! $VERCEL_CMD whoami &> /dev/null; then
    echo "🔑 Please login to Vercel:"
    $VERCEL_CMD login
fi

echo ""
echo "📋 Pre-deployment checklist:"
echo "✅ Make sure your backend server is accessible from the internet"
echo "✅ Update environment variables in Vercel dashboard after deployment"
echo "✅ Ensure CORS is configured on your backend for your Vercel domain"
echo ""

read -p "🤔 Have you completed the pre-deployment checklist? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please complete the checklist first. Check docs/vercel-deployment.md for details."
    exit 1
fi

echo ""
echo "🏗️  Building and deploying to Vercel..."

# Deploy to Vercel
$VERCEL_CMD --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Set up environment variables (see .env.vercel for reference)"
echo "3. Update your backend CORS settings to allow your new Vercel domain"
echo "4. Test your deployment thoroughly"
echo ""
echo "📖 For detailed instructions, see: docs/vercel-deployment.md"

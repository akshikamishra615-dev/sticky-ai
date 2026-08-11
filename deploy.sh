#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting deployment for Sticky AI..."

# 1. Pull latest code (if using git)
# git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Apply database migrations
echo "🗄️ Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# 4. Build the application
echo "🔨 Building the application..."
npm run build

# 5. Restart PM2 process
echo "🔄 Restarting application with PM2..."
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js

echo "✅ Deployment complete!"

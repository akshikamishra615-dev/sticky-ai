# VPS Deployment Guide

This guide explains how to deploy Sticky AI to a Virtual Private Server (VPS) such as DigitalOcean, AWS EC2, or Hetzner.

A VPS is highly recommended for Sticky AI because local AI features (Xenova Embeddings and Tesseract OCR) require persistent memory and disk space that serverless environments (like Vercel) cannot guarantee.

## Prerequisites

On your VPS, ensure you have the following installed:
1. **Node.js** (v18+)
2. **NPM**
3. **PM2** (Install globally via `npm install -g pm2`)
4. **Git**
5. **PostgreSQL Database** (e.g., Neon or hosted locally) with the `pgvector` extension installed.

## Initial Setup

1. **Clone the repository** to your VPS:
   ```bash
   git clone <your-repo-url>
   cd sticky-ai
   ```

2. **Configure Environment Variables**:
   Copy the example environment file and fill in your secrets.
   ```bash
   cp .env.example .env
   nano .env
   ```
   *(Ensure you set `DATABASE_URL`, `AUTH_SECRET`, `GROQ_API_KEY`, etc. See `.env.example` for details).*

3. **Make the deployment script executable**:
   ```bash
   chmod +x deploy.sh
   ```

## Deploying

To deploy the application for the first time, or to update it when you push new code, simply run:

```bash
./deploy.sh
```

### What `deploy.sh` does:
1. Installs Node.js dependencies (`npm install`).
2. Generates the Prisma Client.
3. Safely applies any pending database migrations (`npx prisma migrate deploy`). *Note: It will NOT reset your database or drop existing data.*
4. Builds the production Next.js application (`npm run build`).
5. Starts or Restarts the application using PM2 and `ecosystem.config.js`.

## Managing the Application

Sticky AI is configured to run as a background service via PM2. 

- **View live logs:** 
  ```bash
  pm2 logs sticky-ai
  ```
- **Check application status:**
  ```bash
  pm2 status
  ```
- **Stop the application:**
  ```bash
  pm2 stop sticky-ai
  ```

## Persistent Storage Note

By default, uploaded Knowledge Base documents are safely stored in `.data/uploads/` on the VPS filesystem. Because the VPS has persistent block storage, your uploads will remain safely intact across restarts and deployments.

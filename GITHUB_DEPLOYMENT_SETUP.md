# GitHub Actions Automatic Deployment Setup

This guide will help you set up automatic deployment to Vercel when you push code to GitHub.

## 📋 Prerequisites

- GitHub account with your repository
- Vercel account with your project deployed
- Vercel Project ID
- Vercel Access Token

## 🚀 Setup Steps

### Step 1: Get Your Vercel Project ID

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your STH Gadgets project
3. Go to **Settings** → **General**
4. Copy the **Project ID** (it looks like: `proj_xxxxxxxxxxxxxx`)

### Step 2: Create Vercel Access Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name it: `GitHub Actions Deployment`
4. Scope: Select your STH Gadgets project or "Full Account"
5. Click **Create**
6. **Copy the token** (you won't see it again!)

### Step 3: Add Secrets to GitHub Repository

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

   **Secret 1: VERCEL_TOKEN**
   - Name: `VERCEL_TOKEN`
   - Value: Paste your Vercel Access Token from Step 2
   - Click **Add secret**

   **Secret 2: VERCEL_PROJECT_ID** (Optional - for future use)
   - Name: `VERCEL_PROJECT_ID`
   - Value: Paste your Project ID from Step 1
   - Click **Add secret**

### Step 4: Connect Vercel to GitHub (If not already connected)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Git**
4. Click **Connect to GitHub**
5. Authorize Vercel to access your GitHub
6. Select your repository
7. Click **Import**

### Step 5: Push Code to GitHub

Now whenever you push to the `main` or `master` branch, automatic deployment will trigger:

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Add GitHub Actions for automatic deployment"

# Push to GitHub
git push origin main
```

### Step 6: Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. You'll see the deployment workflow running
4. Click on the workflow to see progress
5. On success, your site will be automatically deployed to Vercel

## 🎯 How It Works

1. **Push Code** → You push code to GitHub
2. **Trigger** → GitHub Actions workflow starts automatically
3. **Build** → The workflow builds your Next.js project
4. **Deploy** → Vercel CLI deploys to production
5. **Success** → Your site is live with the new changes

## 🔧 Workflow Features

- ✅ Automatic deployment on push to main/master
- ✅ Manual deployment trigger from GitHub UI
- ✅ Pull request deployment preview
- ✅ Deployment URL comments on PRs
- ✅ Caching for faster builds
- ✅ Production build optimization

## 📱 Alternative: Connect GitHub to Vercel Directly

If you prefer Vercel's native integration (easier setup):

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Click **Import Git Repository**
4. Select your GitHub repository
5. Vercel will automatically deploy on every push

This is simpler and doesn't require GitHub Actions setup.

## 🆚 GitHub Actions vs Vercel Native Integration

| Feature | GitHub Actions | Vercel Native |
|---------|---------------|---------------|
| Setup Difficulty | Medium | Easy |
| Customization | High | Medium |
| Control | Full | Limited |
| Required Secrets | Vercel Token | None |
| Build Time | Same | Same |
| Preview Deployments | Yes | Yes |
| **Recommendation** | For advanced users | For most users |

## 🎉 Recommended Approach

**For your STH Gadgets project, I recommend using Vercel's native GitHub integration** because:

- ✅ Easier to set up
- ✅ No secrets management needed
- ✅ Built-in preview deployments
- ✅ Automatic optimization
- ✅ No workflow files to maintain

## 🔄 To Use Vercel Native Integration Instead:

1. Delete the `.github/workflows/deploy.yml` file
2. Go to Vercel Dashboard
3. Connect your GitHub repository
4. Enable automatic deployments
5. Done!

## 📞 Need Help?

If you face any issues:

1. Check GitHub Actions logs for errors
2. Verify Vercel token has correct permissions
3. Ensure Node.js version matches (currently set to 18)
4. Check if build passes locally with `npm run build`

---

**Generated for STH Gadgets Admin Panel**

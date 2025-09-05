# Quick Vercel Deployment Guide

## Option 1: Deploy via Vercel Dashboard (Easiest for Pi/headless setup)

### Step 1: Push your code to GitHub
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Prepare for Vercel deployment"

# Push to GitHub (replace with your repository URL)
git remote add origin https://github.com/yourusername/adv_mission_control.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy via Vercel Dashboard
1. Open a web browser on any device
2. Go to [vercel.com](https://vercel.com)
3. Sign up/login with GitHub
4. Click "New Project"
5. Import your `adv_mission_control` repository
6. Configure:
   - Framework Preset: **Vite**
   - Root Directory: **/** (leave as default)
   - Build Command: **npm run build**
   - Output Directory: **dist**
   - Install Command: **npm install**
7. Click "Deploy"

### Step 3: Set Environment Variables in Vercel
1. After deployment, go to your project dashboard
2. Click "Settings" tab
3. Click "Environment Variables"
4. Add these variables (replace URLs with your actual backend):

```
VITE_BACKEND_URL=https://your-backend-url.com:3001
VITE_WEBSOCKET_URL=wss://your-backend-url.com:3001
VITE_WS_URL=wss://your-backend-url.com:3001
VITE_FRONT_CAMERA_URL=https://your-backend-url.com:8085/stream
VITE_BACK_CAMERA_URL=https://your-backend-url.com:8086/stream
VITE_LEFT_CAMERA_URL=https://your-backend-url.com:8084/stream
VITE_RIGHT_CAMERA_URL=https://your-backend-url.com:8083/stream
VITE_API_KEY=your-secret-api-key-here
```

5. Click "Save"
6. Go to "Deployments" tab and click "Redeploy" to apply the new environment variables

## Option 2: CLI Deployment (if you have GUI access)

### Using the installed Vercel CLI:
```bash
# Login (opens browser)
npx vercel login

# Deploy
npx vercel --prod
```

## Option 3: Alternative Hosting Services

### Netlify (Similar to Vercel)
1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Site Settings

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Important: Prepare Your Backend

Before the frontend will work, you need to:

1. **Make your backend accessible from internet**:
   ```bash
   # Option A: Use ngrok (temporary)
   npm install -g ngrok
   ngrok http 3001
   # Use the HTTPS URL in your Vercel environment variables
   
   # Option B: Set up port forwarding on your router
   # Forward port 3001 to your Pi's local IP
   ```

2. **Update backend CORS settings** to allow your Vercel domain

3. **Ensure WebSocket support** over WSS (secure WebSocket)

## Test Your Deployment

1. Visit your Vercel URL
2. Check browser console for any errors
3. Test all functionality:
   - WebSocket connection
   - Camera streams
   - Vehicle controls
   - Sensor data

Your frontend will be live at: `https://your-project-name.vercel.app`

# Vercel Deployment Guide for ADV Mission Control Frontend

## Prerequisites
1. Vercel account (free tier available)
2. Your backend server accessible from the internet (with public IP or domain)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Steps to Deploy

### 1. Prepare Your Backend for Internet Access
Before deploying the frontend, ensure your backend server is accessible from the internet:

- **Option A: Use ngrok (temporary/testing)**
  ```bash
  # Install ngrok if not already installed
  npm install -g ngrok
  
  # Expose your backend server (make sure it's running on port 3001)
  ngrok http 3001
  
  # Use the HTTPS URL provided by ngrok in your environment variables
  ```

- **Option B: Use your router's port forwarding**
  - Forward port 3001 to your Pi's local IP
  - Use your public IP address or set up dynamic DNS

- **Option C: Deploy backend to cloud (recommended for production)**
  - Deploy to Railway, Heroku, DigitalOcean, etc.

### 2. Deploy to Vercel

#### Method 1: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
vercel

# Follow the prompts:
# - Link to existing project or create new one
# - Confirm framework detection (Vite)
# - Set environment variables when prompted
```

#### Method 2: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub, GitLab, or Bitbucket
3. Click "New Project"
4. Import your repository
5. Configure project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 3. Set Environment Variables in Vercel Dashboard
1. Go to your project in Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add these variables (replace URLs with your actual backend URLs):

```
VITE_BACKEND_URL=https://your-backend-domain.com:3001
VITE_WEBSOCKET_URL=wss://your-backend-domain.com:3001
VITE_WS_URL=wss://your-backend-domain.com:3001
VITE_FRONT_CAMERA_URL=https://your-backend-domain.com:8085/stream
VITE_BACK_CAMERA_URL=https://your-backend-domain.com:8086/stream
VITE_LEFT_CAMERA_URL=https://your-backend-domain.com:8084/stream
VITE_RIGHT_CAMERA_URL=https://your-backend-domain.com:8083/stream
VITE_API_KEY=your-secret-api-key-here
```

### 4. Backend CORS Configuration
Make sure your backend server allows requests from your Vercel domain. Update your backend's CORS configuration to include your Vercel URL.

## Important Notes

### Security Considerations
- **Never commit sensitive environment variables to Git**
- Use strong API keys and rotate them regularly
- Consider implementing authentication for production use
- Limit CORS origins to your specific Vercel domain in production

### WebSocket Connections
- Ensure your backend supports WebSocket connections over HTTPS/WSS
- Some hosting providers require specific configuration for WebSocket support

### Camera Streams
- Camera streams need to be accessible from the internet
- Consider bandwidth limitations when streaming multiple camera feeds
- Implement authentication for camera access in production

## Troubleshooting

### Common Issues
1. **CORS Errors**: Update backend CORS configuration
2. **WebSocket Connection Failed**: Ensure WSS protocol and proper certificates
3. **Camera Streams Not Loading**: Check if camera URLs are publicly accessible
4. **Build Failures**: Verify all dependencies are in package.json

### Testing Your Deployment
1. Check browser console for any connection errors
2. Test WebSocket connectivity to your backend
3. Verify camera streams load properly
4. Test vehicle control functionality

## Alternative Deployment Options
- **Netlify**: Similar to Vercel, supports static sites
- **Surge.sh**: Simple static site hosting
- **Firebase Hosting**: Google's hosting solution
- **GitHub Pages**: Free hosting for public repositories

## Production Recommendations
1. Use a proper domain name for your backend
2. Implement SSL certificates for HTTPS/WSS
3. Set up monitoring and logging
4. Consider using a CDN for better performance
5. Implement proper authentication and authorization

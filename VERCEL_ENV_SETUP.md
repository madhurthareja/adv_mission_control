# 🚀 VERCEL ENVIRONMENT VARIABLES SETUP

## Current ngrok URL: https://001c49625cd6.ngrok-free.app

Go to your Vercel project dashboard → Settings → Environment Variables and add these:

```
VITE_BACKEND_URL = https://001c49625cd6.ngrok-free.app
VITE_WEBSOCKET_URL = wss://001c49625cd6.ngrok-free.app  
VITE_WS_URL = wss://001c49625cd6.ngrok-free.app
VITE_FRONT_CAMERA_URL = https://001c49625cd6.ngrok-free.app/api/camera/front/stream
VITE_BACK_CAMERA_URL = https://001c49625cd6.ngrok-free.app/api/camera/back/stream
VITE_LEFT_CAMERA_URL = https://001c49625cd6.ngrok-free.app/api/camera/left/stream
VITE_RIGHT_CAMERA_URL = https://001c49625cd6.ngrok-free.app/api/camera/right/stream
VITE_API_KEY = dev-mission-control-key
```

## ✅ After setting these variables:

1. **Redeploy your Vercel app** (trigger a new deployment)
2. **Camera streams should work** - they will load over HTTPS through ngrok
3. **WebSocket connection will work** - using wss:// instead of http://

## 🔧 Quick fixes for current issues:

### Issue 1: Mixed Content (SOLVED)
- **Problem**: HTTPS page loading HTTP streams
- **Solution**: All URLs now use HTTPS ngrok tunnel

### Issue 2: Connection Refused (SOLVED)  
- **Problem**: Frontend trying to connect to localhost:3001
- **Solution**: All URLs now point to ngrok tunnel

### Issue 3: Camera Streams (SHOULD WORK NOW)
- **Status**: All 4 cameras are running and accessible
- **Ports**: 8081-8084 active with real camera feeds
- **Backend proxy**: Working and ready to serve streams

## 🎯 Next Steps:

1. Set the environment variables above in Vercel dashboard
2. Trigger a new deployment (or push a commit to main branch) 
3. Your camera streams should display on Vercel! 🎉

## 📋 Current System Status:

✅ **Pi Camera v3 (imx708)**: Port 8082 → Front Camera  
✅ **Pi Camera v2 (imx219)**: Port 8081 → Back Camera  
✅ **USB C270 Camera 1**: Port 8084 → Left Camera  
✅ **USB C270 Camera 2**: Port 8083 → Right Camera  
✅ **Backend Server**: Running with proxy routes  
✅ **ngrok Tunnel**: Active and accessible  
✅ **Environment Template**: Ready for Vercel

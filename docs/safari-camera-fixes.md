# Safari Camera Sleep Prevention Guide

## 🍎 **Safari Camera Issues & Solutions**

Safari has aggressive power management that can cause camera streams to go black or sleep after periods of inactivity. I've implemented multiple layers of protection against this.

## 🔧 **Implemented Fixes**

### **1. Camera Stream Keep-Alive**
```typescript
// Monitor camera tracks every 5 seconds
setInterval(() => {
  const videoTracks = webcamStream.getVideoTracks();
  if (videoTracks[0].readyState === 'ended') {
    restartCamera(); // Automatically restart if ended
  }
}, 5000);
```

### **2. Video Element Protection**
```typescript
// Prevent Safari from pausing videos
video.addEventListener('pause', () => {
  if (webcamStream) {
    video.play().catch(console.error);
  }
});

// Safari-specific attributes
video.setAttribute('playsinline', 'true');
video.setAttribute('webkit-playsinline', 'true');
video.disablePictureInPicture = true;
```

### **3. Tab Visibility Handler**
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Re-activate videos when tab becomes visible
    videos.forEach(video => video.play());
  }
});
```

### **4. Synthetic Activity Generator**
```typescript
// Simulate user activity every 30 seconds
setInterval(() => {
  document.dispatchEvent(new Event('synthetic-activity'));
  videos.forEach(video => {
    video.style.transform = 'translateZ(0)'; // Trigger renderer
  });
}, 30000);
```

### **5. Hardware Acceleration**
```css
.video-stream {
  /* Force hardware acceleration */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  will-change: transform;
}
```

## 🔍 **Debugging Camera Issues**

### **Check Browser Console:**
```javascript
// Open Safari Dev Tools (⌘⌥I) and look for these messages:
"Camera track ended, attempting to restart..."
"Camera restarted successfully"
"Restarting camera due to inactivity..."
```

### **Manual Camera Restart:**
If camera goes black, the system will automatically attempt restart. You can also:
1. Switch to another tab and back
2. Use the joystick (triggers activity)
3. Click on any camera feed

## 🚀 **Additional Safari Optimizations**

### **1. Reduce Resource Usage**
- **Lower resolution**: 640x480 instead of 1080p
- **Reduce FPS**: 15fps for active, 5fps for standby
- **Disable audio**: Audio tracks disabled to save resources

### **2. Safari-Specific Settings**
```typescript
const constraints = {
  video: {
    width: { ideal: 640, max: 640 },
    height: { ideal: 480, max: 480 },
    frameRate: { ideal: 15, max: 30 },
    facingMode: 'user' // Safari prefers this
  },
  audio: false // Explicitly disable
};
```

### **3. Memory Management**
- **Automatic cleanup** when component unmounts
- **Track monitoring** to detect ended streams  
- **Graceful restart** with delay between stop/start

## ⚙️ **Safari Camera Settings**

### **Enable Camera Access:**
1. Safari → Settings → Websites → Camera
2. Set your site to "Allow"
3. Ensure "Auto-Play" is enabled

### **Performance Settings:**
1. Safari → Develop → Experimental Features
2. Enable "WebRTC H264 Hardware Encoder"
3. Enable "WebRTC VP9 Profile 2 Codec"

## 🔄 **Automatic Recovery Process**

### **When Camera Goes Black:**
1. **Detection** - System detects track.readyState === 'ended'
2. **Cleanup** - Stops existing tracks cleanly
3. **Delay** - Waits 1 second for cleanup
4. **Restart** - Requests new camera stream
5. **Recovery** - Reconnects to all video elements

### **Fallback Strategy:**
```typescript
try {
  // Attempt restart
  const newStream = await getUserMedia(constraints);
  setWebcamStream(newStream);
} catch (error) {
  // If restart fails, show offline state
  setVideoFeeds(feeds => feeds.map(feed => ({ 
    ...feed, 
    active: false 
  })));
}
```

## 📱 **Mobile Safari Specific**

### **iOS Limitations:**
- Camera access requires user interaction
- Background tabs pause video streams
- Device orientation can affect camera

### **iOS Optimizations:**
```css
/* Prevent iOS from optimizing away video */
video {
  -webkit-transform: translateZ(0);
  pointer-events: auto;
  will-change: transform;
}
```

## 🎯 **Testing the Fixes**

### **Test Scenarios:**
1. **Leave tab open for 10+ minutes** - Camera should stay active
2. **Switch to another tab and back** - Camera should resume
3. **Minimize browser window** - Camera should restart when restored
4. **Use device for other apps** - Camera should recover when returning

### **Expected Behavior:**
- **Green status dots** remain active
- **⚡ Active indicators** stay visible
- **Automatic restart messages** in console if needed
- **No permanent black screens**

### **If Camera Still Goes Black:**
1. Check Safari settings for camera permissions
2. Try refreshing the page
3. Check console for error messages
4. Ensure Safari is updated to latest version

## 🔧 **Manual Recovery**

### **Quick Fixes:**
```javascript
// In browser console, force camera restart:
window.location.reload(); // Nuclear option

// Or try switching camera direction:
// Use the joystick to move forward/backward
```

### **Browser Restart:**
If issues persist:
1. Close all Safari tabs
2. Quit Safari completely (⌘Q)
3. Restart Safari
4. Navigate back to dashboard

The system now has comprehensive protection against Safari's camera sleep behavior and should maintain stable video streaming for extended periods!

import React, { useState, useEffect, useRef } from 'react';
import { VideoFeed } from '../types';

interface VideoFeedGridProps {
  fullscreen?: boolean;
  currentDirection?: string; // 'forward', 'backward', 'left', 'right', 'stop'
}

const VideoFeedGrid: React.FC<VideoFeedGridProps> = ({ fullscreen = false, currentDirection = 'stop' }) => {
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([
    {
      id: 'front',
      name: 'Front Camera',
      url: 'local-webcam',
      active: false,
      resolution: { width: 640, height: 480 },
      fps: 10, // Low FPS when inactive
    },
    {
      id: 'back',
      name: 'Back Camera', 
      url: 'local-webcam',
      active: false,
      resolution: { width: 640, height: 480 },
      fps: 5, // Very low FPS
    },
    {
      id: 'left',
      name: 'Left Camera',
      url: 'local-webcam',
      active: false,
      resolution: { width: 640, height: 480 },
      fps: 5, // Very low FPS
    },
    {
      id: 'right',
      name: 'Right Camera',
      url: 'local-webcam',
      active: false,
      resolution: { width: 640, height: 480 },
      fps: 5, // Very low FPS
    },
  ]);

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [activeCameras, setActiveCameras] = useState<Set<string>>(new Set(['front'])); // Start with front camera
  const streamConstraints = useRef<{ [key: string]: MediaStreamConstraints }>({});
  const keepAliveInterval = useRef<number | null>(null);
  const lastActivityTime = useRef<number>(Date.now());
  const wakeLock = useRef<any>(null);

  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  // Function to restart camera when it goes to sleep
  const restartCamera = async () => {
    try {
      console.log('Restarting camera due to inactivity...');
      
      // Stop existing stream
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      
      // Brief delay before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Request new stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 640 },
          height: { ideal: 480, max: 480 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setWebcamStream(newStream);
      console.log('Camera restarted successfully');
    } catch (error) {
      console.error('Failed to restart camera:', error);
      // Mark cameras as inactive if restart fails
      setVideoFeeds(feeds => feeds.map(feed => ({ 
        ...feed, 
        active: false 
      })));
    }
  };

  // Add visibility change handler to prevent sleep on tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && webcamStream) {
        // Tab became visible, ensure video is playing
        Object.values(videoRefs.current).forEach(video => {
          if (video && video.paused) {
            video.play().catch(console.error);
          }
        });
        lastActivityTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [webcamStream]);

  // Smart camera activation based on movement direction
  useEffect(() => {
    let newActiveCameras = new Set<string>();
    
    // Update activity time when direction changes
    lastActivityTime.current = Date.now();
    
    switch (currentDirection) {
      case 'forward':
        newActiveCameras.add('front');
        break;
      case 'backward':
        newActiveCameras.add('back');
        break;
      case 'left':
        newActiveCameras.add('left');
        newActiveCameras.add('front'); // Keep front for reference
        break;
      case 'right':
        newActiveCameras.add('right');
        newActiveCameras.add('front'); // Keep front for reference
        break;
      default: // 'stop'
        newActiveCameras.add('front'); // Default to front camera
        break;
    }
    
    setActiveCameras(newActiveCameras);
  }, [currentDirection]);

  // Initialize MacBook webcam with optimized constraints
  useEffect(() => {
    const initWebcam = async () => {
      try {
        // Request camera with Safari-friendly constraints
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 15, max: 30 },
            // Safari-specific optimizations
            facingMode: 'user'
          },
          audio: false // Explicitly disable audio to reduce resource usage
        });
        
        setWebcamStream(stream);
        
        // Try to acquire wake lock to prevent system sleep (Safari 15+)
        if ('wakeLock' in navigator) {
          try {
            wakeLock.current = await (navigator as any).wakeLock.request('screen');
            console.log('Screen wake lock acquired');
          } catch (error) {
            console.log('Wake lock not supported or failed:', error);
          }
        }
        
        // Update all camera status to active since we're using the same webcam
        setVideoFeeds(feeds => feeds.map(feed => ({ 
          ...feed, 
          active: true,
          fps: activeCameras.has(feed.id) ? 15 : 5 // Dynamic FPS based on active state
        })));
        
        console.log('MacBook camera initialized with Safari optimizations');
      } catch (error) {
        console.error('Error accessing MacBook camera:', error);
        setVideoFeeds(feeds => feeds.map(feed => ({ 
          ...feed, 
          active: false 
        })));
      }
    };

    initWebcam();

    // Cleanup function
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      if (wakeLock.current) {
        wakeLock.current.release();
        wakeLock.current = null;
      }
    };
  }, []);

  // Update video elements when webcam stream is available
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(feedId => {
      const videoElement = videoRefs.current[feedId];
      if (videoElement && webcamStream) {
        videoElement.srcObject = webcamStream;
        
        // Safari-specific video element configuration
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('webkit-playsinline', 'true');
        videoElement.muted = true;
        videoElement.autoplay = true;
        
        // Prevent Safari from pausing video
        videoElement.addEventListener('pause', () => {
          if (webcamStream) {
            videoElement.play().catch(console.error);
          }
        });
        
        // Adjust visual state based on camera activity
        if (activeCameras.has(feedId)) {
          videoElement.style.opacity = '1';
          videoElement.style.filter = 'none';
        } else {
          videoElement.style.opacity = '0.7';
          videoElement.style.filter = 'grayscale(50%)';
        }
      }
    });
    
    // Start keep-alive mechanism 
    if (webcamStream && !keepAliveInterval.current) {
      keepAliveInterval.current = window.setInterval(() => {
        // Check if camera tracks are still active
        const videoTracks = webcamStream.getVideoTracks();
        if (videoTracks.length > 0) {
          const track = videoTracks[0];
          if (track.readyState === 'ended') {
            console.log('Camera track ended, attempting to restart...');
            restartCamera();
          } else {
            // Keep track alive by accessing settings
            try {
              track.getSettings();
              lastActivityTime.current = Date.now();
            } catch (error) {
              console.warn('Camera track access error:', error);
            }
          }
        }
        
        // Ensure video elements are playing
        Object.values(videoRefs.current).forEach(video => {
          if (video && video.paused && webcamStream) {
            video.play().catch(console.error);
          }
        });
      }, 5000); // Check every 5 seconds
    }
  }, [webcamStream, activeCameras]);

  // Add page interaction handlers to keep Safari active
  useEffect(() => {
    const keepPageActive = () => {
      lastActivityTime.current = Date.now();
    };

    const events = ['click', 'touch', 'scroll', 'keypress', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, keepPageActive, { passive: true });
    });

    // Simulate user activity periodically to prevent sleep
    const activitySimulator = setInterval(() => {
      // Create a minimal synthetic event to keep page active
      const syntheticEvent = new Event('synthetic-activity');
      document.dispatchEvent(syntheticEvent);
      
      // Keep video elements visible and active
      Object.values(videoRefs.current).forEach(video => {
        if (video && webcamStream) {
          // Ensure video is playing and visible
          if (video.paused) {
            video.play().catch(console.error);
          }
          // Trigger a small style change to keep renderer active
          video.style.transform = video.style.transform || 'translateZ(0)';
        }
      });
    }, 30000); // Every 30 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, keepPageActive);
      });
      clearInterval(activitySimulator);
    };
  }, [webcamStream]);

  // Update camera status based on active cameras for visual feedback
  useEffect(() => {
    const updateCameraStatus = () => {
      setVideoFeeds(feeds => feeds.map(feed => ({
        ...feed,
        // All cameras are technically active since they use the same stream
        // But we show different visual states based on current focus
        active: true,
        fps: activeCameras.has(feed.id) ? 15 : 5
      })));
    };

    const interval = setInterval(updateCameraStatus, 2000);
    return () => clearInterval(interval);
  }, [activeCameras]);

  const handleFeedClick = (feedId: string) => {
    setSelectedFeed(selectedFeed === feedId ? null : feedId);
  };

  const getCameraTransform = (feedId: string): string => {
    // Apply different transforms to simulate different camera angles
    switch (feedId) {
      case 'front':
        return 'scaleX(1)'; // Normal front view
      case 'back':
        return 'scaleX(1)'; // Flip and rotate for rear view
      case 'left':
        return 'scaleX(1)'; // Rotate left
      case 'right':
        return 'scaleX(1)'; // Rotate right
      default:
        return 'scaleX(1)';
    }
  };

  const VideoFeedCard: React.FC<{ feed: VideoFeed }> = ({ feed }) => {
    const isActive = activeCameras.has(feed.id);
    const transform = getCameraTransform(feed.id);
    
    return (
      <div 
        className={`video-feed-card ${feed.active ? 'active' : 'inactive'} ${selectedFeed === feed.id ? 'selected' : ''} ${isActive ? 'priority' : 'standby'}`}
        onClick={() => handleFeedClick(feed.id)}
      >
        <div className="video-header">
          <h3>{feed.name}</h3>
          <div className="camera-status">
            <span className={`status-dot ${feed.active ? 'online' : 'offline'}`}>
              {feed.active ? '🟢' : '🔴'}
            </span>
            <span className={`priority-indicator ${isActive ? 'active' : 'standby'}`}>
              {isActive ? '⚡' : '💤'}
            </span>
          </div>
        </div>
        
        <div className="video-container">
          {feed.active ? (
            <video 
              ref={(el) => {
                if (el) {
                  videoRefs.current[feed.id] = el;
                  // Immediate Safari configuration
                  el.setAttribute('playsinline', 'true');
                  el.setAttribute('webkit-playsinline', 'true');
                  el.muted = true;
                  el.autoplay = true;
                  el.controls = false;
                  el.disablePictureInPicture = true;
                  
                  // Prevent context menu
                  el.addEventListener('contextmenu', (e) => e.preventDefault());
                  
                  // Handle play failures
                  el.addEventListener('loadedmetadata', () => {
                    el.play().catch(console.error);
                  });
                }
              }}
              autoPlay 
              muted 
              playsInline
              controls={false}
              disablePictureInPicture
              className={`video-stream camera-${feed.id} ${isActive ? 'camera-active' : 'camera-standby'}`}
              onPause={(e) => {
                // Prevent Safari from pausing
                const video = e.target as HTMLVideoElement;
                if (webcamStream) {
                  setTimeout(() => video.play().catch(console.error), 100);
                }
              }}
              onEnded={(e) => {
                // Handle stream ending
                console.log('Video stream ended, restarting...');
                restartCamera();
              }}
            />
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">📹</span>
                <span className="placeholder-text">Camera Access Denied</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="video-info">
          <span className="resolution">{feed.resolution.width}x{feed.resolution.height}</span>
          <span className="fps">{feed.fps}fps</span>
          <span className="status">{isActive ? 'ACTIVE' : 'STANDBY'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`video-feed-grid ${fullscreen ? 'fullscreen' : ''}`}>
      <div className="video-grid">
        {videoFeeds.map(feed => (
          <VideoFeedCard key={feed.id} feed={feed} />
        ))}
      </div>
      
      {selectedFeed && (
        <div className="video-controls">
          <button onClick={() => setSelectedFeed(null)}>
            Close Fullscreen
          </button>
          <button onClick={() => console.log('Record video')}>
            📹 Record
          </button>
          <button onClick={() => console.log('Take screenshot')}>
            📸 Screenshot
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoFeedGrid;

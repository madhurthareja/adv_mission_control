import React, { useState, useEffect } from 'react';
import { VideoFeed } from '../types';

interface VideoFeedGridProps {
  fullscreen?: boolean;
  currentDirection?: string; // 'forward', 'backward', 'left', 'right', 'stop'
}

const VideoFeedGrid: React.FC<VideoFeedGridProps> = ({ fullscreen = false, currentDirection = 'stop' }) => {
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([
    {
      id: 'front',
      name: 'Front Camera (Pi v3)',
      url: import.meta.env.VITE_FRONT_CAMERA_URL || 'http://localhost:8082/stream',
      active: true,
      resolution: { width: 640, height: 480 },
      fps: 15,
    },
    {
      id: 'back',
      name: 'Back Camera (Pi v2)', 
      url: import.meta.env.VITE_BACK_CAMERA_URL || 'http://localhost:8081/stream',
      active: true,
      resolution: { width: 640, height: 480 },
      fps: 15,
    },
    {
      id: 'left',
      name: 'Left Camera (USB)',
      url: import.meta.env.VITE_LEFT_CAMERA_URL || 'http://localhost:8084/stream',
      active: true,
      resolution: { width: 640, height: 480 },
      fps: 15,
    },
    {
      id: 'right',
      name: 'Right Camera (USB)',
      url: import.meta.env.VITE_RIGHT_CAMERA_URL || 'http://localhost:8083/stream',
      active: true,
      resolution: { width: 640, height: 480 },
      fps: 15,
    },
  ]);

  const [activeCameras, setActiveCameras] = useState<Set<string>>(new Set(['front']));
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  // Debug: Log environment variables
  useEffect(() => {
    console.log('🔍 Camera URLs from environment:');
    console.log('Front:', import.meta.env.VITE_FRONT_CAMERA_URL);
    console.log('Back:', import.meta.env.VITE_BACK_CAMERA_URL);
    console.log('Left:', import.meta.env.VITE_LEFT_CAMERA_URL);
    console.log('Right:', import.meta.env.VITE_RIGHT_CAMERA_URL);
    console.log('Backend:', import.meta.env.VITE_BACKEND_URL);
  }, []);

  // Smart camera activation based on movement direction
  useEffect(() => {
    let newActiveCameras = new Set<string>();
    
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

  const handleFeedClick = (feedId: string) => {
    setSelectedFeed(selectedFeed === feedId ? null : feedId);
  };

  const VideoFeedCard: React.FC<{ feed: VideoFeed }> = ({ feed }) => {
    const isActive = activeCameras.has(feed.id);
    
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
            <img 
              src={feed.url}
              alt={feed.name}
              className={`video-stream camera-${feed.id} ${isActive ? 'camera-active' : 'camera-standby'}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isActive ? 1 : 0.7,
                filter: isActive ? 'none' : 'grayscale(50%)'
              }}
              onError={(e) => {
                console.error(`❌ Failed to load ${feed.name} stream:`, e);
                console.error(`URL attempted: ${feed.url}`);
                // Test the URL directly
                fetch(feed.url, { method: 'HEAD' })
                  .then(response => console.log(`${feed.name} HEAD request:`, response.status, response.statusText))
                  .catch(err => console.error(`${feed.name} fetch error:`, err));
              }}
              onLoad={() => {
                console.log(`✅ ${feed.name} stream loaded successfully from: ${feed.url}`);
              }}
            />
          ) : (
            <div className="video-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">📹</span>
                <span className="placeholder-text">Camera Offline</span>
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

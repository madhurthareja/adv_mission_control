import React, { useState, useEffect } from 'react';
import { VideoFeed } from '../types';

interface VideoFeedGridProps {
  fullscreen?: boolean;
}

const VideoFeedGrid: React.FC<VideoFeedGridProps> = ({ fullscreen = false }) => {
  const [videoFeeds, setVideoFeeds] = useState<VideoFeed[]>([
    {
      id: 'front',
      name: 'Front Camera',
      url: 'http://localhost:8080/stream/front',
      active: false,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    },
    {
      id: 'back',
      name: 'Back Camera',
      url: 'http://localhost:8080/stream/back',
      active: false,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    },
    {
      id: 'left',
      name: 'Left Camera',
      url: 'http://localhost:8080/stream/left',
      active: false,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    },
    {
      id: 'right',
      name: 'Right Camera',
      url: 'http://localhost:8080/stream/right',
      active: false,
      resolution: { width: 1920, height: 1080 },
      fps: 30,
    },
  ]);

  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  useEffect(() => {
    // Simulate video feed status checking
    const checkVideoFeeds = () => {
      setVideoFeeds(feeds => feeds.map(feed => ({
        ...feed,
        active: Math.random() > 0.5 // Simulate random connectivity
      })));
    };

    const interval = setInterval(checkVideoFeeds, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFeedClick = (feedId: string) => {
    setSelectedFeed(selectedFeed === feedId ? null : feedId);
  };

  const VideoFeedCard: React.FC<{ feed: VideoFeed }> = ({ feed }) => (
    <div 
      className={`video-feed-card ${feed.active ? 'active' : 'inactive'} ${selectedFeed === feed.id ? 'selected' : ''}`}
      onClick={() => handleFeedClick(feed.id)}
    >
      <div className="video-header">
        <h3>{feed.name}</h3>
        <span className={`status-dot ${feed.active ? 'online' : 'offline'}`}>
          {feed.active ? '🟢' : '🔴'}
        </span>
      </div>
      
      <div className="video-container">
        {feed.active ? (
          <img 
            src={feed.url} 
            alt={feed.name}
            className="video-stream"
            onError={(e) => {
              console.log(`Video feed error for ${feed.name}:`, e);
            }}
          />
        ) : (
          <div className="video-placeholder">
            <div className="placeholder-content">
              <span className="placeholder-icon">📹</span>
              <span className="placeholder-text">No Signal</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="video-info">
        <span className="resolution">{feed.resolution.width}x{feed.resolution.height}</span>
        <span className="fps">{feed.fps}fps</span>
      </div>
    </div>
  );

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

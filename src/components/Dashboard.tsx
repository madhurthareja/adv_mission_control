import React, { useState, useEffect } from 'react';
import VideoFeedGrid from './VideoFeedGrid';
import SensorDashboard from './SensorDashboard';
import ControlInterface from './ControlInterface';
import SystemStatus from './SystemStatus';
import LidarVisualization from './LidarVisualization';
import webSocketService from '../services/websocket';
import { SensorData, SystemStatus as SystemStatusType, VehicleControl } from '../types';

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'video' | 'sensors'>('overview');
  const [currentDirection, setCurrentDirection] = useState<string>('stop');

  useEffect(() => {
    // Setup WebSocket event handlers
    webSocketService.onSensorDataReceived((data) => {
      console.log('🎯 Dashboard received sensor data:', data);
      setSensorData(data);
    });
    webSocketService.onSystemStatusReceived(setSystemStatus);
    webSocketService.onConnectionChanged(setIsConnected);

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const handleControlInput = (control: VehicleControl) => {
    // Determine direction based on control input
    let direction = 'stop';
    
    if (control.forward > 20) {
      direction = 'forward';
    } else if (control.forward < -20) {
      direction = 'backward';
    } else if (control.turn > 20) {
      direction = 'right';
    } else if (control.turn < -20) {
      direction = 'left';
    }
    
    setCurrentDirection(direction);
    webSocketService.sendControl(control);
  };

  const handleSystemCommand = (command: string, payload?: any) => {
    webSocketService.sendSystemCommand(command, payload);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Mission Control</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {systemStatus && (
            <span className="latency">
              Latency: {systemStatus.latency}ms
            </span>
          )}
        </div>
      </header>

      <nav className="dashboard-nav">
        <button 
          className={selectedView === 'overview' ? 'active' : ''}
          onClick={() => setSelectedView('overview')}
        >
          Overview
        </button>
        <button 
          className={selectedView === 'video' ? 'active' : ''}
          onClick={() => setSelectedView('video')}
        >
          Video Feeds
        </button>
        <button 
          className={selectedView === 'sensors' ? 'active' : ''}
          onClick={() => setSelectedView('sensors')}
        >
          Sensors
        </button>
      </nav>

      <main className="dashboard-main">
        {selectedView === 'overview' && (
          <div className="overview-layout">
            <div className="video-section">
              <VideoFeedGrid currentDirection={currentDirection} />
            </div>
            <div className="control-section">
              <ControlInterface onControlChange={handleControlInput} />
            </div>
            <div className="lidar-section">
              <div className="lidar-visualization">
                <h3>LiDAR</h3>
                <LidarVisualization data={sensorData} size={180} />
              </div>
            </div>
            <div className="system-section">
              <SystemStatus 
                status={systemStatus} 
                onSystemCommand={handleSystemCommand}
              />
            </div>
          </div>
        )}

        {selectedView === 'video' && (
          <div className="video-layout">
            <VideoFeedGrid fullscreen currentDirection={currentDirection} />
          </div>
        )}

        {selectedView === 'sensors' && (
          <div className="sensor-layout">
            <SensorDashboard data={sensorData} expanded />
          </div>
        )}
      </main>

      {selectedView === 'overview' && (
        <div className="dashboard-bottom-strip">
          <div className="battery-strip">
            <span className="strip-label">Battery:</span>
            <span className="strip-value">{sensorData?.battery?.percentage?.toFixed(1) || '85.0'}%</span>
            <div className="mini-battery-bar">
              <div 
                className="mini-battery-fill" 
                data-percentage={sensorData?.battery?.percentage || 85}
              />
            </div>
            <span className="strip-detail">{sensorData?.battery?.voltage?.toFixed(1) || '12.4'}V</span>
          </div>
          <div className="temperature-strip">
            <span className="strip-label">Temp:</span>
            <span className="strip-value">{sensorData?.temperature?.toFixed(1) || '28.5'}°C</span>
            <span className="strip-status">
              {(sensorData?.temperature || 28.5) > 35 ? '🔥' : (sensorData?.temperature || 28.5) < 10 ? '🧊' : '✅'}
            </span>
          </div>
          <div className="connection-strip">
            <span className="strip-label">Connection:</span>
            <span className={`strip-value ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Online' : '🔴 Offline'}
            </span>
            {systemStatus && (
              <span className="strip-detail">{systemStatus.latency}ms</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

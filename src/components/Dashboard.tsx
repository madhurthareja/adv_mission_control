import React, { useState, useEffect } from 'react';
import VideoFeedGrid from './VideoFeedGrid';
import SensorDashboard from './SensorDashboard';
import ControlInterface from './ControlInterface';
import SystemStatus from './SystemStatus';
import webSocketService from '../services/websocket';
import { SensorData, SystemStatus as SystemStatusType, VehicleControl } from '../types';

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'video' | 'sensors' | 'control'>('overview');

  useEffect(() => {
    // Setup WebSocket event handlers
    webSocketService.onSensorDataReceived(setSensorData);
    webSocketService.onSystemStatusReceived(setSystemStatus);
    webSocketService.onConnectionChanged(setIsConnected);

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const handleControlInput = (control: VehicleControl) => {
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
        <button 
          className={selectedView === 'control' ? 'active' : ''}
          onClick={() => setSelectedView('control')}
        >
          Control
        </button>
      </nav>

      <main className="dashboard-main">
        {selectedView === 'overview' && (
          <div className="overview-layout">
            <div className="video-section">
              <VideoFeedGrid />
            </div>
            <div className="control-section">
              <ControlInterface onControlChange={handleControlInput} />
            </div>
            <div className="sensor-section">
              <SensorDashboard data={sensorData} />
            </div>
            <div className="status-section">
              <SystemStatus 
                status={systemStatus} 
                onSystemCommand={handleSystemCommand}
              />
            </div>
          </div>
        )}

        {selectedView === 'video' && (
          <div className="video-layout">
            <VideoFeedGrid fullscreen />
          </div>
        )}

        {selectedView === 'sensors' && (
          <div className="sensor-layout">
            <SensorDashboard data={sensorData} expanded />
          </div>
        )}

        {selectedView === 'control' && (
          <div className="control-layout">
            <ControlInterface onControlChange={handleControlInput} expanded />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

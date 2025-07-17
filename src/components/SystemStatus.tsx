import React, { useState } from 'react';
import { SystemStatus as SystemStatusType } from '../types';

interface SystemStatusProps {
  status: SystemStatusType | null;
  onSystemCommand: (command: string, payload?: any) => void;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ status, onSystemCommand }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateMockStatus = (): SystemStatusType => ({
    connected: true,
    latency: 45 + Math.random() * 20,
    commandQueue: Math.floor(Math.random() * 5),
    videoStreams: {
      front: Math.random() > 0.2,
      back: Math.random() > 0.3,
      left: Math.random() > 0.4,
      right: Math.random() > 0.5,
    },
    controlMode: Math.random() > 0.5 ? 'remote' : 'joystick',
  });

  const displayStatus = status || generateMockStatus();

  const handleEmergencyStop = () => {
    onSystemCommand('emergency_stop');
  };

  const handleResetSystem = () => {
    onSystemCommand('reset_system');
  };

  const handleVideoStreamToggle = (stream: string) => {
    onSystemCommand('toggle_video_stream', { stream });
  };

  const handleControlModeChange = (mode: string) => {
    onSystemCommand('set_control_mode', { mode });
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'good';
    if (latency < 100) return 'warning';
    return 'danger';
  };

  const getControlModeColor = (mode: string) => {
    switch (mode) {
      case 'remote': return 'info';
      case 'joystick': return 'warning';
      case 'autonomous': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className="system-status">
      <div className="status-header">
        <h3>System Status</h3>
        <button 
          className="toggle-advanced"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced
        </button>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-item">
            <label>Connection:</label>
            <span className={`status-value ${displayStatus.connected ? 'connected' : 'disconnected'}`}>
              {displayStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>

          <div className="status-item">
            <label>Latency:</label>
            <span className={`status-value ${getLatencyColor(displayStatus.latency)}`}>
              {displayStatus.latency.toFixed(0)}ms
            </span>
          </div>

          <div className="status-item">
            <label>Command Queue:</label>
            <span className={`status-value ${displayStatus.commandQueue > 3 ? 'warning' : 'normal'}`}>
              {displayStatus.commandQueue} commands
            </span>
          </div>

          <div className="status-item">
            <label>Control Mode:</label>
            <span className={`status-value ${getControlModeColor(displayStatus.controlMode)}`}>
              {displayStatus.controlMode.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="video-streams-status">
          <h4>Video Streams</h4>
          <div className="stream-grid">
            {Object.entries(displayStatus.videoStreams).map(([stream, active]) => (
              <div key={stream} className="stream-status">
                <span className={`stream-indicator ${active ? 'active' : 'inactive'}`}>
                  {active ? '🟢' : '🔴'}
                </span>
                <span className="stream-name">{stream.charAt(0).toUpperCase() + stream.slice(1)}</span>
                <button 
                  className="stream-toggle"
                  onClick={() => handleVideoStreamToggle(stream)}
                >
                  {active ? 'Stop' : 'Start'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="control-actions">
          <button 
            className="emergency-stop"
            onClick={handleEmergencyStop}
          >
            🛑 EMERGENCY STOP
          </button>
          
          <div className="control-mode-selector">
            <label>Control Mode:</label>
            <select 
              value={displayStatus.controlMode}
              onChange={(e) => handleControlModeChange(e.target.value)}
            >
              <option value="remote">Remote Control</option>
              <option value="joystick">Physical Joystick</option>
              <option value="autonomous">Autonomous</option>
            </select>
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="advanced-status">
          <div className="system-info">
            <h4>System Information</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Uptime:</label>
                <span>2h 34m 12s</span>
              </div>
              <div className="info-item">
                <label>CPU Usage:</label>
                <span>23%</span>
              </div>
              <div className="info-item">
                <label>Memory Usage:</label>
                <span>456MB / 1GB</span>
              </div>
              <div className="info-item">
                <label>Network:</label>
                <span>WiFi: Strong</span>
              </div>
            </div>
          </div>

          <div className="diagnostic-actions">
            <h4>Diagnostic Actions</h4>
            <div className="action-buttons">
              <button onClick={handleResetSystem}>
                🔄 Reset System
              </button>
              <button onClick={() => onSystemCommand('run_diagnostics')}>
                🔍 Run Diagnostics
              </button>
              <button onClick={() => onSystemCommand('calibrate_sensors')}>
                ⚙️ Calibrate Sensors
              </button>
              <button onClick={() => onSystemCommand('download_logs')}>
                📥 Download Logs
              </button>
            </div>
          </div>

          <div className="system-logs">
            <h4>Recent System Logs</h4>
            <div className="log-container">
              <div className="log-entry info">
                <span className="timestamp">14:23:45</span>
                <span className="level">INFO</span>
                <span className="message">System initialized successfully</span>
              </div>
              <div className="log-entry warning">
                <span className="timestamp">14:23:47</span>
                <span className="level">WARN</span>
                <span className="message">Left camera stream quality degraded</span>
              </div>
              <div className="log-entry info">
                <span className="timestamp">14:23:50</span>
                <span className="level">INFO</span>
                <span className="message">Remote control connection established</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;

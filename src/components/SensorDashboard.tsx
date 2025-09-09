import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { SensorData } from '../types';
import LidarVisualization from './LidarVisualization';
import ObstacleAvoidance from './ObstacleAvoidance';

interface SensorDashboardProps {
  data: SensorData | null;
  expanded?: boolean;
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ data, expanded = false }) => {
  const [sensorHistory, setSensorHistory] = useState<{
    timestamp: number;
    battery: number;
    temperature: number;
    lidarDistance: number;
  }[]>([]);

  useEffect(() => {
    if (data) {
      const newEntry = {
        timestamp: Date.now(),
        battery: data.battery.percentage,
        temperature: data.imu?.temperature || data.temperature || 25,
        lidarDistance: data.lidar.distance,
      };

      setSensorHistory(prev => {
        const updated = [...prev, newEntry];
        // Keep only last 50 entries
        return updated.slice(-50);
      });
    }
  }, [data]);

  const generateMockData = () => ({
    lidar: {
      distance: 150 + Math.random() * 100,
      angle: Math.random() * 360,
      obstacles: Array.from({ length: 5 }, (_, i) => ({
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
      })),
    },
    imu: {
      acceleration: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: 9.8 + (Math.random() - 0.5) * 0.5,
      },
      gyroscope: {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 10,
      },
      magnetometer: {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        z: (Math.random() - 0.5) * 100,
      },
    },
    battery: {
      voltage: 12.0 + Math.random() * 2,
      current: Math.random() * 5,
      percentage: 80 + Math.random() * 20,
    },
    temperature: 25, // Default value - should be replaced by real MPU temperature
  });

  // Create display data - prioritize real MPU data when available
  const createDisplayData = () => {
    if (data) {
      // Check if we have real MPU data with all required fields
      const hasRealMPU = data.imu && 
        typeof data.imu.roll === 'number' && 
        typeof data.imu.pitch === 'number' && 
        typeof data.imu.temperature === 'number';
      
      if (hasRealMPU) {
        console.log('🟢 Using REAL MPU data:', {
          roll: data.imu.roll,
          pitch: data.imu.pitch,
          temp: data.imu.temperature,
          jerk: data.imu.jerk
        });
        
        // Use real MPU data - no mixing with mock values
        return {
          ...data,
          temperature: data.imu.temperature, // Always use MPU temperature
        };
      } else {
        console.log('🟡 Partial data received, using with defaults:', data);
        // Use what we have from data, fill missing with sensible defaults
        return {
          lidar: data.lidar || { distance: 0, angle: 0, obstacles: [] },
          imu: {
            acceleration: data.imu?.acceleration || { x: 0, y: 0, z: 9.8 },
            gyroscope: data.imu?.gyroscope || { x: 0, y: 0, z: 0 },
            magnetometer: data.imu?.magnetometer || { x: 0, y: 0, z: 0 },
            roll: data.imu?.roll || 0,
            pitch: data.imu?.pitch || 0,
            jerk: data.imu?.jerk || 0,
            temperature: data.imu?.temperature || 25,
          },
          battery: data.battery || { voltage: 12.0, current: 0, percentage: 100 },
          temperature: data.imu?.temperature || data.temperature || 25,
        };
      }
    }
    
    // No data at all - show static defaults
    console.log('🔴 No data received, using mock defaults');
    return {
      lidar: { distance: 0, angle: 0, obstacles: [] },
      imu: {
        acceleration: { x: 0, y: 0, z: 9.8 },
        gyroscope: { x: 0, y: 0, z: 0 },
        magnetometer: { x: 0, y: 0, z: 0 },
        roll: 0,
        pitch: 0,
        jerk: 0,
        temperature: 25,
      },
      battery: { voltage: 12.0, current: 0, percentage: 100 },
      temperature: 25,
    };
  };

  const displayData = createDisplayData();

  const SensorCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="sensor-card">
      <h3>{title}</h3>
      <div className="sensor-content">
        {children}
      </div>
    </div>
  );

  const formatValue = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  return (
    <div className={`sensor-dashboard ${expanded ? 'expanded' : ''}`}>
      {/* Data Source Indicator */}
      <div className="data-source-indicator">
        {data && data.imu && typeof data.imu.roll === 'number' && typeof data.imu.pitch === 'number' ? (
          <span className="real-data">🟢 Live MPU6050 Data - Roll: {data.imu.roll.toFixed(1)}° Pitch: {data.imu.pitch.toFixed(1)}°</span>
        ) : data ? (
          <span className="partial-data">🟡 Partial Sensor Data</span>
        ) : (
          <span className="mock-data">🔴 No Live Data - Using Defaults</span>
        )}
      </div>
      
      <div className="sensor-grid">
        {expanded && (
          <div className="sensor-card lidar-card">
            <LidarVisualization data={displayData} size={200} />
          </div>
        )}
        
        <SensorCard title="Battery Status">
          <div className="battery-info">
            <div className="battery-percentage">
              <span className="value">{formatValue(displayData.battery.percentage, 1)}%</span>
              <div className="battery-bar">
                <div 
                  className="battery-fill" 
                  style={{ width: `${displayData.battery.percentage}%` }}
                />
              </div>
            </div>
            <div className="battery-details">
              <span>Voltage: {formatValue(displayData.battery.voltage)}V</span>
              <span>Current: {formatValue(displayData.battery.current)}A</span>
            </div>
          </div>
        </SensorCard>

        <SensorCard title="LIDAR">
          <div className="lidar-info">
            <div className="lidar-distance">
              <span className="label">Distance:</span>
              <span className="value">{formatValue(displayData.lidar.distance)}cm</span>
            </div>
            <div className="lidar-angle">
              <span className="label">Angle:</span>
              <span className="value">{formatValue(displayData.lidar.angle)}°</span>
            </div>
            <div className="obstacles">
              <span className="label">Obstacles:</span>
              <span className="value">{displayData.lidar.obstacles.length}</span>
            </div>
          </div>
        </SensorCard>

        <SensorCard title="IMU - Acceleration">
          <div className="imu-data">
            <div className="axis-value">
              <span className="axis">X:</span>
              <span className="value">{formatValue(displayData.imu.acceleration.x)} m/s²</span>
            </div>
            <div className="axis-value">
              <span className="axis">Y:</span>
              <span className="value">{formatValue(displayData.imu.acceleration.y)} m/s²</span>
            </div>
            <div className="axis-value">
              <span className="axis">Z:</span>
              <span className="value">{formatValue(displayData.imu.acceleration.z)} m/s²</span>
            </div>
          </div>
        </SensorCard>

        <SensorCard title="MPU6050 Orientation">
          <div className="mpu-orientation">
            <div className="orientation-value">
              <span className="label">Roll:</span>
              <span className="value">
                {typeof displayData.imu.roll === 'number' ? 
                  formatValue(displayData.imu.roll, 1) : '--'}°
              </span>
            </div>
            <div className="orientation-value">
              <span className="label">Pitch:</span>
              <span className="value">
                {typeof displayData.imu.pitch === 'number' ? 
                  formatValue(displayData.imu.pitch, 1) : '--'}°
              </span>
            </div>
            <div className="orientation-value">
              <span className="label">Temp:</span>
              <span className="value">
                {typeof displayData.imu.temperature === 'number' ? 
                  formatValue(displayData.imu.temperature, 1) : '--'}°C
              </span>
            </div>
            {typeof displayData.imu.jerk === 'number' && (
              <div className="jerk-indicator">
                <span className="label">Motion:</span>
                <span className={`jerk-status ${displayData.imu.jerk ? 'active' : 'inactive'}`}>
                  {displayData.imu.jerk ? '⚡ Jerk Detected' : '✅ Stable'}
                </span>
              </div>
            )}
          </div>
        </SensorCard>

        <SensorCard title="Temperature">
          <div className="temperature-info">
            <span className="temperature-value">{formatValue(displayData.temperature)}°C</span>
            <div className="temperature-status">
              {displayData.temperature > 35 ? '🔥 Hot' : displayData.temperature < 10 ? '🧊 Cold' : '✅ Normal'}
            </div>
          </div>
        </SensorCard>

        {expanded && (
          <>
            <SensorCard title="Gyroscope">
              <div className="imu-data">
                <div className="axis-value">
                  <span className="axis">X:</span>
                  <span className="value">{formatValue(displayData.imu.gyroscope.x)} rad/s</span>
                </div>
                <div className="axis-value">
                  <span className="axis">Y:</span>
                  <span className="value">{formatValue(displayData.imu.gyroscope.y)} rad/s</span>
                </div>
                <div className="axis-value">
                  <span className="axis">Z:</span>
                  <span className="value">{formatValue(displayData.imu.gyroscope.z)} rad/s</span>
                </div>
              </div>
            </SensorCard>

            <SensorCard title="Navigation">
              <ObstacleAvoidance data={displayData} />
            </SensorCard>
          </>
        )}
      </div>

      {expanded && sensorHistory.length > 0 && (
        <div className="sensor-charts">
          <div className="chart-container">
            <h3>Sensor History</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <Line type="monotone" dataKey="battery" stroke="#00ff00" name="Battery %" />
                <Line type="monotone" dataKey="temperature" stroke="#ff0000" name="Temperature °C" />
                <Line type="monotone" dataKey="lidarDistance" stroke="#0000ff" name="LIDAR Distance cm" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;

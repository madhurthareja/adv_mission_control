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
        temperature: data.temperature,
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
    temperature: 25 + Math.random() * 10,
  });

  const displayData = data || generateMockData();

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
      <div className="sensor-grid">
        {expanded && (
          <div className="sensor-card lidar-card">
            <LidarVisualization data={displayData} size={280} />
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

            <SensorCard title="Magnetometer">
              <div className="imu-data">
                <div className="axis-value">
                  <span className="axis">X:</span>
                  <span className="value">{formatValue(displayData.imu.magnetometer.x)} µT</span>
                </div>
                <div className="axis-value">
                  <span className="axis">Y:</span>
                  <span className="value">{formatValue(displayData.imu.magnetometer.y)} µT</span>
                </div>
                <div className="axis-value">
                  <span className="axis">Z:</span>
                  <span className="value">{formatValue(displayData.imu.magnetometer.z)} µT</span>
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

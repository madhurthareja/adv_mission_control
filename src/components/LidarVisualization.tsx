import React, { useEffect, useRef, useState } from 'react';
import { SensorData } from '../types';

interface LidarVisualizationProps {
  data: SensorData | null;
  size?: number;
}

interface LidarPoint {
  distance: number;
  angle: number;
  intensity?: number;
}

const LidarVisualization: React.FC<LidarVisualizationProps> = ({ data, size = 300 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lidarPoints, setLidarPoints] = useState<LidarPoint[]>([]);
  const [scanAngle, setScanAngle] = useState(0);

  // Generate mock LIDAR data for demonstration
  const generateMockLidarData = (): LidarPoint[] => {
    const points: LidarPoint[] = [];
    const numPoints = 360; // 360 degree scan
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 360) / numPoints;
      let distance = 200 + Math.random() * 100; // Base distance with noise
      
      // Add some obstacles
      if (angle > 45 && angle < 75) {
        distance = 50 + Math.random() * 30; // Obstacle on right
      } else if (angle > 285 && angle < 315) {
        distance = 80 + Math.random() * 40; // Obstacle on left
      } else if (angle > 170 && angle < 190) {
        distance = 120 + Math.random() * 20; // Obstacle behind
      }
      
      points.push({
        distance,
        angle,
        intensity: Math.random() * 255
      });
    }
    
    return points;
  };

  useEffect(() => {
    // Update LIDAR data
    if (data?.lidar) {
      // Use real data if available, otherwise generate mock data
      const mockData = generateMockLidarData();
      setLidarPoints(mockData);
    } else {
      // Generate mock data for demonstration
      const mockData = generateMockLidarData();
      setLidarPoints(mockData);
    }
  }, [data]);

  useEffect(() => {
    // Animate scanning beam
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 2) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 20;

    // Draw background circles (distance rings)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const radius = (maxRadius * i) / 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw distance labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let i = 1; i <= 4; i++) {
      const radius = (maxRadius * i) / 4;
      const distance = (i * 100).toString() + 'cm';
      ctx.fillText(distance, centerX + radius - 10, centerY - 5);
    }

    // Draw cardinal direction lines
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // North (0°)
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - maxRadius);
    // East (90°)
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + maxRadius, centerY);
    // South (180°)
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY + maxRadius);
    // West (270°)
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - maxRadius, centerY);
    ctx.stroke();

    // Draw direction labels
    ctx.fillStyle = '#888';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, centerY - maxRadius + 15);
    ctx.fillText('E', centerX + maxRadius - 10, centerY + 5);
    ctx.fillText('S', centerX, centerY + maxRadius - 5);
    ctx.fillText('W', centerX - maxRadius + 10, centerY + 5);

    // Draw LIDAR points
    lidarPoints.forEach((point, index) => {
      const angle = (point.angle * Math.PI) / 180;
      const distance = Math.min(point.distance, 400); // Cap at 400cm
      const radius = (distance / 400) * maxRadius;
      
      const x = centerX + Math.sin(angle) * radius;
      const y = centerY - Math.cos(angle) * radius;

      // Color based on distance (closer = red, farther = green)
      const intensity = Math.max(0, Math.min(1, 1 - distance / 400));
      const red = Math.floor(255 * intensity);
      const green = Math.floor(255 * (1 - intensity));
      const blue = 0;

      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw scanning beam
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    const beamAngle = (scanAngle * Math.PI) / 180;
    const beamX = centerX + Math.sin(beamAngle) * maxRadius;
    const beamY = centerY - Math.cos(beamAngle) * maxRadius;
    ctx.lineTo(beamX, beamY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw center dot
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Draw vehicle outline
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(centerX - 8, centerY - 12, 16, 24);
    ctx.stroke();

  }, [lidarPoints, scanAngle, size]);

  const currentDistance = data?.lidar?.distance || 0;
  const currentAngle = data?.lidar?.angle || 0;
  const obstacleCount = data?.lidar?.obstacles?.length || 0;

  return (
    <div className="lidar-visualization">
      <div className="lidar-header">
        <h3>LIDAR Visualization</h3>
        <div className="lidar-stats">
          <span className="stat">
            Distance: <strong>{currentDistance.toFixed(0)}cm</strong>
          </span>
          <span className="stat">
            Angle: <strong>{currentAngle.toFixed(0)}°</strong>
          </span>
          <span className="stat">
            Obstacles: <strong>{obstacleCount}</strong>
          </span>
        </div>
      </div>
      
      <div className="lidar-canvas-container">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="lidar-canvas"
        />
      </div>
      
      <div className="lidar-controls">
        <div className="lidar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff0000' }}></div>
            <span>Close (&lt;100cm)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div>
            <span>Medium (100-200cm)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#00ff00' }}></div>
            <span>Far (&gt;200cm)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#00ff88' }}></div>
            <span>Scanning Beam</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LidarVisualization;

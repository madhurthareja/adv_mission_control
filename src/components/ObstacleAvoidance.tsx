import React from 'react';
import { SensorData } from '../types';

interface ObstacleAvoidanceProps {
  data: SensorData | null;
}

const ObstacleAvoidance: React.FC<ObstacleAvoidanceProps> = ({ data }) => {
  const analyzeObstacles = () => {
    if (!data?.lidar) {
      return {
        frontClear: false,
        leftClear: false,
        rightClear: false,
        backClear: false,
        nearestObstacle: 0,
        recommendedAction: 'No LIDAR data'
      };
    }

    const obstacles = data.lidar.obstacles || [];
    const currentDistance = data.lidar.distance || 0;
    
    // Analyze obstacles in different quadrants
    const frontObstacles = obstacles.filter(obs => obs.y > 0 && Math.abs(obs.x) < 50);
    const leftObstacles = obstacles.filter(obs => obs.x < -30 && Math.abs(obs.y) < 50);
    const rightObstacles = obstacles.filter(obs => obs.x > 30 && Math.abs(obs.y) < 50);
    const backObstacles = obstacles.filter(obs => obs.y < -30 && Math.abs(obs.x) < 50);

    const safeDistance = 80; // cm
    
    return {
      frontClear: frontObstacles.length === 0 && currentDistance > safeDistance,
      leftClear: leftObstacles.length === 0,
      rightClear: rightObstacles.length === 0,
      backClear: backObstacles.length === 0,
      nearestObstacle: currentDistance,
      recommendedAction: getRecommendedAction(frontObstacles, leftObstacles, rightObstacles, backObstacles, currentDistance, safeDistance)
    };
  };

  const getRecommendedAction = (front: any[], left: any[], right: any[], back: any[], distance: number, safeDistance: number) => {
    if (distance < safeDistance) {
      if (left.length === 0) return 'Turn Left';
      if (right.length === 0) return 'Turn Right';
      if (back.length === 0) return 'Reverse';
      return 'STOP - Trapped';
    }
    
    if (front.length > 0) {
      if (left.length === 0) return 'Turn Left';
      if (right.length === 0) return 'Turn Right';
      return 'Slow Down';
    }
    
    return 'Path Clear';
  };

  const analysis = analyzeObstacles();

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Path Clear': return '#00ff88';
      case 'Turn Left': 
      case 'Turn Right': return '#ffaa00';
      case 'Slow Down': return '#ff6600';
      case 'Reverse': return '#ff3300';
      case 'STOP - Trapped': return '#ff0000';
      default: return '#888';
    }
  };

  return (
    <div className="obstacle-avoidance">
      <h4>Obstacle Avoidance</h4>
      
      <div className="path-indicators">
        <div className="path-grid">
          <div className="path-cell"></div>
          <div className={`path-cell ${analysis.frontClear ? 'clear' : 'blocked'}`}>
            <span className="direction-label">Front</span>
            <span className="status-icon">{analysis.frontClear ? '✅' : '❌'}</span>
          </div>
          <div className="path-cell"></div>
          
          <div className={`path-cell ${analysis.leftClear ? 'clear' : 'blocked'}`}>
            <span className="direction-label">Left</span>
            <span className="status-icon">{analysis.leftClear ? '✅' : '❌'}</span>
          </div>
          <div className="path-cell vehicle">
            <span className="vehicle-icon">🚗</span>
          </div>
          <div className={`path-cell ${analysis.rightClear ? 'clear' : 'blocked'}`}>
            <span className="direction-label">Right</span>
            <span className="status-icon">{analysis.rightClear ? '✅' : '❌'}</span>
          </div>
          
          <div className="path-cell"></div>
          <div className={`path-cell ${analysis.backClear ? 'clear' : 'blocked'}`}>
            <span className="direction-label">Back</span>
            <span className="status-icon">{analysis.backClear ? '✅' : '❌'}</span>
          </div>
          <div className="path-cell"></div>
        </div>
      </div>

      <div className="avoidance-info">
        <div className="info-item">
          <span className="label">Nearest Obstacle:</span>
          <span className="value">{analysis.nearestObstacle.toFixed(0)}cm</span>
        </div>
        
        <div className="info-item">
          <span className="label">Recommended Action:</span>
          <span 
            className="value action" 
            style={{ color: getActionColor(analysis.recommendedAction) }}
          >
            {analysis.recommendedAction}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ObstacleAvoidance;

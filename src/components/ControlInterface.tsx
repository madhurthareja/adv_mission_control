import React, { useState, useEffect, useCallback } from 'react';
import { VehicleControl } from '../types';

interface ControlInterfaceProps {
  onControlChange: (control: VehicleControl) => void;
  expanded?: boolean;
}

const ControlInterface: React.FC<ControlInterfaceProps> = ({ onControlChange, expanded = false }) => {
  const [control, setControl] = useState<VehicleControl>({
    forward: 0,
    turn: 0,
    speed: 50,
    brake: false,
  });

  const [keyPressed, setKeyPressed] = useState<Set<string>>(new Set());
  const [joystickActive, setJoystickActive] = useState(false);

  // Handle keyboard input
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    setKeyPressed(prev => new Set(prev).add(event.key.toLowerCase()));
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    event.preventDefault();
    setKeyPressed(prev => {
      const newSet = new Set(prev);
      newSet.delete(event.key.toLowerCase());
      return newSet;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Update control based on keyboard input
  useEffect(() => {
    const newControl = { ...control };
    
    // Movement controls
    if (keyPressed.has('w') || keyPressed.has('arrowup')) {
      newControl.forward = 100;
    } else if (keyPressed.has('s') || keyPressed.has('arrowdown')) {
      newControl.forward = -100;
    } else {
      newControl.forward = 0;
    }

    // Turning controls
    if (keyPressed.has('a') || keyPressed.has('arrowleft')) {
      newControl.turn = -100;
    } else if (keyPressed.has('d') || keyPressed.has('arrowright')) {
      newControl.turn = 100;
    } else {
      newControl.turn = 0;
    }

    // Brake control
    newControl.brake = keyPressed.has(' ') || keyPressed.has('x');

    setControl(newControl);
  }, [keyPressed]);

  // Send control updates
  useEffect(() => {
    onControlChange(control);
  }, [control, onControlChange]);

  // Virtual joystick handlers
  const handleJoystickStart = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    setJoystickActive(true);
  };

  const handleJoystickMove = (event: React.MouseEvent | React.TouchEvent) => {
    if (!joystickActive) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    let clientX, clientY;
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;

    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = Math.min(centerX, centerY) * 0.8;

    if (distance > maxDistance) {
      const angle = Math.atan2(y, x);
      const limitedX = Math.cos(angle) * maxDistance;
      const limitedY = Math.sin(angle) * maxDistance;
      
      setControl(prev => ({
        ...prev,
        turn: (limitedX / maxDistance) * 100,
        forward: -(limitedY / maxDistance) * 100,
      }));
    } else {
      setControl(prev => ({
        ...prev,
        turn: (x / maxDistance) * 100,
        forward: -(y / maxDistance) * 100,
      }));
    }
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setControl(prev => ({
      ...prev,
      forward: 0,
      turn: 0,
    }));
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseInt(event.target.value);
    setControl(prev => ({ ...prev, speed }));
  };

  const handleBrakeToggle = () => {
    setControl(prev => ({ ...prev, brake: !prev.brake }));
  };

  return (
    <div className={`control-interface ${expanded ? 'expanded' : ''}`}>
      <div className="control-grid">
        <div className="virtual-joystick-container">
          <h3>Virtual Joystick</h3>
          <div 
            className="virtual-joystick"
            onMouseDown={handleJoystickStart}
            onMouseMove={handleJoystickMove}
            onMouseUp={handleJoystickEnd}
            onMouseLeave={handleJoystickEnd}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
          >
            <div className="joystick-background">
              <div className="joystick-center"></div>
              <div 
                className="joystick-handle"
                style={{
                  transform: `translate(${control.turn}%, ${-control.forward}%)`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="control-panel">
          <h3>Vehicle Control</h3>
          
          <div className="control-values">
            <div className="control-value">
              <label>Forward:</label>
              <span className={control.forward > 0 ? 'positive' : control.forward < 0 ? 'negative' : 'zero'}>
                {control.forward.toFixed(0)}%
              </span>
            </div>
            <div className="control-value">
              <label>Turn:</label>
              <span className={control.turn > 0 ? 'positive' : control.turn < 0 ? 'negative' : 'zero'}>
                {control.turn.toFixed(0)}%
              </span>
            </div>
            <div className="control-value">
              <label>Speed:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={control.speed}
                onChange={handleSpeedChange}
              />
              <span>{control.speed}%</span>
            </div>
          </div>

          <div className="control-buttons">
            <button 
              className={`brake-button ${control.brake ? 'active' : ''}`}
              onMouseDown={handleBrakeToggle}
              onMouseUp={handleBrakeToggle}
            >
              {control.brake ? '🛑 BRAKING' : '⚪ BRAKE'}
            </button>
          </div>
        </div>

        <div className="keyboard-controls">
          <h3>Keyboard Controls</h3>
          <div className="keyboard-layout">
            <div className="keyboard-row">
              <div className={`key ${keyPressed.has('w') ? 'active' : ''}`}>W</div>
            </div>
            <div className="keyboard-row">
              <div className={`key ${keyPressed.has('a') ? 'active' : ''}`}>A</div>
              <div className={`key ${keyPressed.has('s') ? 'active' : ''}`}>S</div>
              <div className={`key ${keyPressed.has('d') ? 'active' : ''}`}>D</div>
            </div>
            <div className="keyboard-row">
              <div className={`key space ${keyPressed.has(' ') ? 'active' : ''}`}>SPACE</div>
            </div>
          </div>
          <div className="keyboard-legend">
            <p>W/S: Forward/Backward</p>
            <p>A/D: Left/Right</p>
            <p>SPACE: Brake</p>
            <p>Arrow keys also work</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="advanced-controls">
          <div className="preset-controls">
            <h3>Preset Actions</h3>
            <button onClick={() => setControl(prev => ({ ...prev, forward: 50, turn: 0 }))}>
              Forward 50%
            </button>
            <button onClick={() => setControl(prev => ({ ...prev, forward: -50, turn: 0 }))}>
              Reverse 50%
            </button>
            <button onClick={() => setControl(prev => ({ ...prev, forward: 0, turn: 100 }))}>
              Turn Right
            </button>
            <button onClick={() => setControl(prev => ({ ...prev, forward: 0, turn: -100 }))}>
              Turn Left
            </button>
            <button onClick={() => setControl({ forward: 0, turn: 0, speed: 50, brake: false })}>
              Stop All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlInterface;

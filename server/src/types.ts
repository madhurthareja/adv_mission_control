// Shared types for Mission Control Server

export interface VehicleControl {
  forward: number;    // -100 to 100
  turn: number;       // -100 to 100 (left negative, right positive)
  speed: number;      // 0 to 100
  brake: boolean;
}

export interface SensorData {
  lidar: {
    distance: number;
    angle: number;
    obstacles: Array<{x: number, y: number}>;
  };
  imu: {
    acceleration: {x: number, y: number, z: number};
    gyroscope: {x: number, y: number, z: number};
    magnetometer: {x: number, y: number, z: number};
  };
  battery: {
    voltage: number;
    current: number;
    percentage: number;
  };
  temperature: number;
}

export interface SystemStatus {
  connected: boolean;
  latency: number;
  commandQueue: number;
  videoStreams: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  controlMode: 'remote' | 'joystick' | 'autonomous';
}

export interface CommandPacket {
  id: string;
  timestamp: number;
  type: 'control' | 'system' | 'video';
  priority: 'high' | 'medium' | 'low';
  payload: any;
}

export interface WebSocketMessage {
  type: 'control' | 'sensor' | 'status' | 'video' | 'command';
  data: any;
  timestamp: number;
}

export interface HardwareStatus {
  pi: {
    connected: boolean;
    lastPing: number;
    cpuUsage: number;
    memoryUsage: number;
    temperature: number;
  };
  esp32: {
    connected: boolean;
    lastPing: number;
    batteryVoltage: number;
    signalStrength: number;
  };
  cameras: {
    front: boolean;
    back: boolean;
    left: boolean;
    right: boolean;
  };
  sensors: {
    lidar: boolean;
    imu: boolean;
    gps: boolean;
  };
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  data?: any;
}

import io, { Socket } from 'socket.io-client';
import { VehicleControl, SensorData, SystemStatus, WebSocketMessage } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event callbacks
  private onSensorData: ((data: SensorData) => void) | null = null;
  private onSystemStatus: ((status: SystemStatus) => void) | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    const serverUrl = (import.meta as any).env?.VITE_WEBSOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to Mission Control server');
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Mission Control server');
      this.onConnectionChange?.(false);
    });

    this.socket.on('reconnect', () => {
      console.log('Reconnected to Mission Control server');
      this.reconnectAttempts = 0;
      this.onConnectionChange?.(true);
    });

    this.socket.on('reconnect_error', () => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts} failed`);
    });

    // Handle incoming sensor data
    this.socket.on('sensor_data', (data: SensorData) => {
      this.onSensorData?.(data);
    });

    // Handle system status updates
    this.socket.on('system_status', (status: SystemStatus) => {
      this.onSystemStatus?.(status);
    });

    // Handle generic messages
    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'sensor':
        this.onSensorData?.(message.data);
        break;
      case 'status':
        this.onSystemStatus?.(message.data);
        break;
      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  // Send vehicle control commands
  sendControl(control: VehicleControl) {
    if (!this.socket?.connected) {
      console.warn('Cannot send control - not connected');
      return;
    }

    const message: WebSocketMessage = {
      type: 'control',
      data: control,
      timestamp: Date.now(),
    };

    this.socket.emit('vehicle_control', message);
  }

  // Send system commands
  sendSystemCommand(command: string, payload?: any) {
    if (!this.socket?.connected) {
      console.warn('Cannot send system command - not connected');
      return;
    }

    const message: WebSocketMessage = {
      type: 'command',
      data: { command, payload },
      timestamp: Date.now(),
    };

    this.socket.emit('system_command', message);
  }

  // Event listeners
  onSensorDataReceived(callback: (data: SensorData) => void) {
    this.onSensorData = callback;
  }

  onSystemStatusReceived(callback: (status: SystemStatus) => void) {
    this.onSystemStatus = callback;
  }

  onConnectionChanged(callback: (connected: boolean) => void) {
    this.onConnectionChange = callback;
  }

  // Connection management
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;

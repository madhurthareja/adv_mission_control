import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketMessage, VehicleControl, SensorData, SystemStatus } from './types';
import { HardwareController } from './hardware/controller';
import { CommandQueue } from './services/commandQueue';
import { DataLogger } from './services/dataLogger';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Services
const hardwareController = new HardwareController();
const commandQueue = new CommandQueue();
const dataLogger = new DataLogger();

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    hardware: hardwareController.getStatus()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Send initial system status
  socket.emit('system_status', hardwareController.getSystemStatus());
  
  // Handle vehicle control commands
  socket.on('vehicle_control', (message: WebSocketMessage) => {
    console.log('Received vehicle control:', message);
    
    if (message.type === 'control') {
      const control: VehicleControl = message.data;
      
      // Add to command queue with high priority
      commandQueue.addCommand({
        id: `ctrl_${Date.now()}`,
        timestamp: Date.now(),
        type: 'control',
        priority: 'high',
        payload: control
      });
      
      // Process command immediately for real-time control
      hardwareController.sendVehicleControl(control);
      
      // Log the command
      dataLogger.logCommand('vehicle_control', control);
    }
  });
  
  // Handle system commands
  socket.on('system_command', (message: WebSocketMessage) => {
    console.log('Received system command:', message);
    
    if (message.type === 'command') {
      const { command, payload } = message.data;
      
      switch (command) {
        case 'emergency_stop':
          hardwareController.emergencyStop();
          io.emit('system_status', hardwareController.getSystemStatus());
          break;
          
        case 'reset_system':
          hardwareController.resetSystem();
          io.emit('system_status', hardwareController.getSystemStatus());
          break;
          
        case 'set_control_mode':
          hardwareController.setControlMode(payload.mode);
          io.emit('system_status', hardwareController.getSystemStatus());
          break;
          
        case 'toggle_video_stream':
          hardwareController.toggleVideoStream(payload.stream);
          io.emit('system_status', hardwareController.getSystemStatus());
          break;
          
        case 'run_diagnostics':
          hardwareController.runDiagnostics();
          break;
          
        case 'calibrate_sensors':
          hardwareController.calibrateSensors();
          break;
          
        case 'download_logs':
          // Send logs to client
          socket.emit('log_download', dataLogger.getLogs());
          break;
          
        default:
          console.warn('Unknown system command:', command);
      }
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Periodic sensor data broadcast
setInterval(() => {
  const sensorData = hardwareController.getSensorData();
  const systemStatus = hardwareController.getSystemStatus();
  
  io.emit('sensor_data', sensorData);
  io.emit('system_status', systemStatus);
}, 100); // 10Hz update rate

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dataLogger.logError('uncaught_exception', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  dataLogger.logError('unhandled_rejection', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Emergency stop
  hardwareController.emergencyStop();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Mission Control Server running on port ${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});

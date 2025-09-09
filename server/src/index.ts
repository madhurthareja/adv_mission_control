import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { WebSocketMessage, VehicleControl, SensorData, SystemStatus } from './types';
import { HardwareController } from './hardware/controller';
import { CommandQueue } from './services/commandQueue';
import { DataLogger } from './services/dataLogger';

dotenv.config();

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration for internet access
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow configured frontend URLs
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});

// Simple authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    // If no API key is set, allow access (development mode)
    return next();
  }
  
  if (apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Middleware
app.use(express.json());

// Services
const hardwareController = new HardwareController();
const commandQueue = new CommandQueue();
const dataLogger = new DataLogger();

// API Routes
app.get('/api/status', authenticate, (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    hardware: hardwareController.getStatus(),
    serverInfo: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
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

// Public endpoint to check if server is running
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'Mission Control Server is running'
  });
});

// Network information endpoint (authenticated)
app.get('/api/network', authenticate, (req, res) => {
  const networkInterfaces = require('os').networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          name,
          address: net.address,
          netmask: net.netmask
        });
      }
    }
  }
  
  res.json({
    interfaces: addresses,
    port: process.env.PORT || 3001,
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`
  });
});

// Camera stream routes - Direct access instead of proxy
// These connect directly to camera streams and forward the data

// MPU sensor data endpoint
app.get('/api/mpu/data', authenticate, (req, res) => {
  console.log('MPU sensor data request');
  
  const http = require('http');
  const options = {
    hostname: '172.20.10.4',  // Local MPU API server
    port: 8087,
    path: '/api/data',
    method: 'GET'
  };
  
  const proxyReq = http.request(options, (proxyRes: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err: any) => {
    console.error('MPU sensor error:', err);
    res.status(503).json({ error: 'MPU sensor unavailable' });
  });
  
  proxyReq.end();
});

app.get('/api/camera/front/stream', (req, res) => {
  console.log('Direct request to front camera stream - using IPv4');
  
  // Set headers for MJPEG stream
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Forward request to smart camera manager
  const http = require('http');
  const options = {
    hostname: '172.20.10.4',
    port: 8080,  // Smart camera manager
    path: '/front',
    method: 'GET'
  };
  
  console.log('Connecting to camera server:', options);
  
  const proxyReq = http.request(options, (proxyRes: any) => {
    // Forward headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Forward response
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err: any) => {
    console.error('Front camera error:', err);
    res.status(503).json({ error: 'Front camera unavailable' });
  });
  
  proxyReq.end();
});

app.get('/api/camera/back/stream', (req, res) => {
  console.log('Direct request to back camera stream');
  
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const http = require('http');
  const options = {
    hostname: '172.20.10.4',
    port: 8080,  // Smart camera manager
    path: '/back',
    method: 'GET'
  };
  
  const proxyReq = http.request(options, (proxyRes: any) => {
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err: any) => {
    console.error('Back camera error:', err);
    res.status(503).json({ error: 'Back camera unavailable' });
  });
  
  proxyReq.end();
});

app.get('/api/camera/left/stream', (req, res) => {
  console.log('Direct request to left camera stream');
  
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const http = require('http');
  const options = {
    hostname: '172.20.10.4',
    port: 8080,  // Smart camera manager
    path: '/right',
    method: 'GET'
  };
  
  const proxyReq = http.request(options, (proxyRes: any) => {
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err: any) => {
    console.error('Left camera error:', err);
    res.status(503).json({ error: 'Left camera unavailable' });
  });
  
  proxyReq.end();
});

app.get('/api/camera/right/stream', (req, res) => {
  console.log('Direct request to right camera stream');
  
  res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const http = require('http');
  const options = {
    hostname: '172.20.10.4',
    port: 8080,  // Smart camera manager
    path: '/left',
    method: 'GET'
  };
  
  const proxyReq = http.request(options, (proxyRes: any) => {
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err: any) => {
    console.error('Right camera error:', err);
    res.status(503).json({ error: 'Right camera unavailable' });
  });
  
  proxyReq.end();
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
  
  // Handle sensor data from Pi controller
  socket.on('sensor_data', (message: WebSocketMessage) => {
    if (message.type === 'sensor_data') {
      // Update hardware controller with real sensor data
      hardwareController.updateSensorData(message.data);
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

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for internet access

server.listen(PORT, HOST, () => {
  console.log(`🚀 Mission Control Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Internet access: ${process.env.PUBLIC_URL || 'Not configured'}`);
  console.log(`🔐 API Key required: ${process.env.API_KEY ? 'Yes' : 'No (Development mode)'}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  
  // Log network interfaces
  const networkInterfaces = require('os').networkInterfaces();
  console.log('📡 Available network interfaces:');
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`   ${name}: http://${net.address}:${PORT}`);
      }
    }
  }
});

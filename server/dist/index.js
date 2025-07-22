"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const controller_1 = require("./hardware/controller");
const commandQueue_1 = require("./services/commandQueue");
const dataLogger_1 = require("./services/dataLogger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Security middleware
app.use((0, helmet_1.default)({
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
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// CORS configuration for internet access
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin)
            return callback(null, true);
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
app.use((0, cors_1.default)(corsOptions));
const io = new socket_io_1.Server(server, {
    cors: corsOptions
});
// Simple authentication middleware
const authenticate = (req, res, next) => {
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
app.use(express_1.default.json());
// Services
const hardwareController = new controller_1.HardwareController();
const commandQueue = new commandQueue_1.CommandQueue();
const dataLogger = new dataLogger_1.DataLogger();
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
// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    // Send initial system status
    socket.emit('system_status', hardwareController.getSystemStatus());
    // Handle vehicle control commands
    socket.on('vehicle_control', (message) => {
        console.log('Received vehicle control:', message);
        if (message.type === 'control') {
            const control = message.data;
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
    socket.on('system_command', (message) => {
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
//# sourceMappingURL=index.js.map
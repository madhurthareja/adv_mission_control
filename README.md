# # Mission Control System

A comprehensive web-based robotics control platform featuring real-time video streaming, sensor monitoring, and remote vehicle control capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd adv_mission_control
   
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server && npm install && cd ..
   ```

2. **Start Development Environment**
   ```bash
   # Option 1: Use the automated startup script
   ./start-dev.sh
   
   # Option 2: Start services manually
   # Terminal 1 - Frontend
   npm run dev
   
   # Terminal 2 - Backend
   cd server && npm run dev
   ```

3. **Access the Dashboard**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/health
   - WebSocket: ws://localhost:3001

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Dashboard**: Main control interface with tabbed navigation
- **Video Feed Grid**: 4-camera display with fullscreen capability
- **Sensor Dashboard**: Real-time sensor data visualization
- **Control Interface**: Virtual joystick + keyboard controls
- **System Status**: Connection monitoring and system diagnostics

### Backend (Node.js + Express + Socket.IO)
- **WebSocket Server**: Real-time bidirectional communication
- **Command Queue**: Priority-based command processing
- **Hardware Controller**: Simulated hardware interface
- **Data Logger**: Comprehensive logging system

## 🎮 Features

### Control System
- **Virtual Joystick**: Touch/mouse-based control
- **Keyboard Controls**: WASD + arrow keys + spacebar
- **Emergency Stop**: Immediate vehicle halt
- **Control Modes**: Remote, Physical Joystick, Autonomous

### Video Streaming
- **Multi-Camera Support**: Front, Back, Left, Right cameras
- **Stream Management**: Start/stop individual feeds
- **Quality Control**: Adjustable resolution and framerate
- **Fullscreen View**: Expand any camera feed

### Sensor Monitoring
- **Real-time Data**: LIDAR, IMU, Battery, Temperature
- **Historical Charts**: Trend visualization with Recharts
- **Alerts**: Visual indicators for critical values
- **Diagnostics**: System health monitoring

### System Management
- **Connection Status**: Real-time connectivity monitoring
- **Command Queue**: Priority-based command processing
- **Error Logging**: Comprehensive error tracking
- **Performance Metrics**: Latency, CPU, Memory usage

## 🔧 Configuration

### Frontend Environment
Create `.env.local` with:
```env
VITE_WEBSOCKET_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
```

### Backend Environment
See `server/.env.example` for configuration options:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SERIAL_PORT=/dev/ttyUSB0
VIDEO_STREAM_PORT=8080
```

## 🛠️ Hardware Integration

### Expected Hardware Setup
- **Raspberry Pi 5**: Main controller running camera streams and sensor acquisition
- **ESP32**: Motor driver with joystick override logic
- **4x USB Cameras**: Front, Back, Left, Right positioning
- **LIDAR Sensor**: Distance measurement and obstacle detection
- **IMU**: Accelerometer, gyroscope, magnetometer
- **Battery Monitor**: Voltage, current, percentage monitoring

### Communication Protocol
- **Pi ↔ Web**: WebSocket over WiFi
- **Pi ↔ ESP32**: Serial/UART communication
- **ESP32**: Priority-based control (Physical joystick > Remote commands)

## 🔌 API Endpoints

### REST API
- `GET /api/health` - Server health check
- `GET /api/status` - System status overview

### WebSocket Events
- `vehicle_control` - Send control commands
- `system_command` - Send system commands
- `sensor_data` - Receive sensor updates
- `system_status` - Receive status updates

## 📊 Development Status

### ✅ Completed
- [x] React frontend with TypeScript
- [x] WebSocket communication layer
- [x] Virtual joystick and keyboard controls
- [x] Multi-camera video feed interface
- [x] Real-time sensor data display
- [x] System status monitoring
- [x] Command queue with priority handling
- [x] Data logging system
- [x] Responsive design for mobile

### 🚧 In Progress
- [ ] Hardware integration (Pi + ESP32)
- [ ] Real video streaming implementation
- [ ] Physical joystick support
- [ ] Authentication system
- [ ] Persistent configuration storage

### 📋 Planned
- [ ] Autonomous navigation modes
- [ ] Route planning and waypoints
- [ ] Advanced sensor fusion
- [ ] Cloud deployment
- [ ] Mobile app companion

## 🧪 Testing

### Development Testing
```bash
# Test frontend
npm run build
npm run preview

# Test backend
cd server
npm run build
npm start
```

### Hardware Testing
1. Ensure all cameras are connected and detected
2. Verify serial communication with ESP32
3. Test joystick override functionality
4. Validate sensor data accuracy

## 🚀 Deployment

### Production Build
```bash
# Build frontend
npm run build

# Build backend
cd server && npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
# Build container
docker build -t mission-control .

# Run container
docker run -p 3001:3001 mission-control
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the existing GitHub issues
- Create a new issue with detailed description
- Include logs and system information

## 🔗 Related Projects

- [ESP32 Firmware](./esp32_firmware/) - Motor control and sensor interface
- [Pi Controller](./pi_controller/) - Raspberry Pi sensor and camera management
- [Documentation](./docs/) - Technical specifications and diagrams

This is a React application initialized with Vite. Below are the instructions for setting up and running the project.

## Getting Started

To get started with this project, follow the steps below:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd my-react-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000` to view the application.

## Project Structure

- `src/`: Contains the source code for the application.
  - `App.tsx`: Main application component.
  - `main.tsx`: Entry point of the React application.
  - `components/`: Directory for reusable components.
    - `ExampleComponent.tsx`: An example functional component.
- `public/`: Contains static assets.
  - `index.html`: Main HTML file for the application.
- `tsconfig.json`: TypeScript configuration file.
- `package.json`: NPM configuration file.
- `vite.config.ts`: Vite configuration file.

## Usage

You can modify the components in the `src/components` directory to customize the application. The main application logic resides in `App.tsx`.

## License

This project is licensed under the MIT License.
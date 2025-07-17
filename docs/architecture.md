# System Architecture - Mission Control

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Dashboard │    │   Backend API   │    │ Raspberry Pi 5  │
│    (Frontend)   │◄──►│   (WebSocket)   │◄──►│  (Controller)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐              ┌───▼───┐              ┌────▼────┐
    │ Mobile  │              │ Cloud │              │  ESP32  │
    │ Access  │              │Deploy │              │ Motors  │
    └─────────┘              └───────┘              └─────────┘
```

## 🔄 Data Flow

### 1. **User Input → Vehicle Control**
```
User Joystick → WebSocket → Backend → Pi Controller → ESP32 → Motors
```

### 2. **Camera Feed → Dashboard**
```
USB Cameras → Pi (FFmpeg) → WebSocket → Frontend → Video Grid
```

### 3. **Sensor Data → Monitoring**
```
Sensors → Pi → WebSocket → Backend → Dashboard → Real-time Charts
```

## 🎯 Component Breakdown

### **Frontend (React + TypeScript)**
- **Dashboard.tsx:** Main control interface
- **VideoFeedGrid.tsx:** 4-camera display
- **ControlInterface.tsx:** Virtual joystick
- **SensorDashboard.tsx:** Real-time monitoring
- **LidarVisualization.tsx:** 360° obstacle detection

### **Backend (Node.js + Express)**
- **WebSocket Server:** Real-time communication
- **Command Queue:** Prioritized command processing
- **Data Logger:** Sensor data storage
- **Hardware Controller:** Pi/ESP32 communication

### **Pi Controller (Python)**
- **Camera Manager:** Multi-camera streaming
- **Sensor Manager:** Data collection
- **ESP32 Controller:** Serial communication
- **Network Manager:** WebSocket client

### **ESP32 Firmware (C++)**
- **Motor Control:** PWM-based movement
- **Joystick Override:** Manual control priority
- **Serial Commands:** JSON-based protocol
- **Safety Features:** Emergency stop & watchdog

## 📡 Communication Protocols

### **WebSocket Messages**
```json
{
  "type": "control",
  "data": {
    "forward": 50,
    "turn": 0,
    "speed": 75,
    "brake": false
  }
}
```

### **Pi ↔ ESP32 Serial**
```json
{
  "cmd": "move",
  "forward": 50,
  "turn": 0,
  "speed": 75,
  "brake": false
}
```

### **Sensor Data Format**
```json
{
  "timestamp": 1703123456789,
  "temperature": 25.5,
  "battery": 87.3,
  "lidar": [...],
  "imu": {...}
}
```

## 🔧 Hardware Integration

### **Raspberry Pi 5 Connections**
- **USB Cameras:** 4x cameras via USB hub
- **ESP32 Communication:** UART (GPIO 14/15)
- **Sensors:** I2C/SPI interfaces
- **Network:** WiFi for backend communication

### **ESP32 Connections**
- **Motor Driver:** L298N via GPIO pins
- **Joystick:** Analog inputs (X/Y axis)
- **Pi Communication:** UART (GPIO 16/17)
- **Power:** 5V for logic, 12V for motors

## 🔐 Security & Safety

### **Safety Features**
- **Emergency Stop:** Physical button + web interface
- **Watchdog Timer:** Auto-stop on communication loss
- **Command Validation:** Input sanitization
- **Rate Limiting:** Prevent command flooding

### **Security Measures**
- **Network Authentication:** WPA3 WiFi
- **Firewall Rules:** Port restrictions
- **SSH Keys:** Secure Pi access
- **Input Validation:** Prevent injection attacks

## 📊 Performance Metrics

### **System Requirements**
- **Pi 5:** 8GB RAM, 64GB+ SD card
- **Network:** 2.4GHz WiFi minimum
- **Cameras:** 1080p @ 30fps max
- **Backend:** 2GB RAM, 1GB disk space

### **Optimization Strategies**
- **Camera Compression:** H.264 encoding
- **WebSocket Batching:** Reduce message frequency
- **Sensor Filtering:** Kalman filters for noise reduction
- **Memory Management:** Buffer optimization

## 🚀 Deployment Options

### **Development Environment**
```bash
# Local development
npm run dev              # Frontend: localhost:3000
cd server && npm run dev # Backend: localhost:3001
python3 pi_controller/main.py # Pi controller
```

### **Production Deployment**
```bash
# Cloud deployment
./setup-cloud-deployment.sh
# Options: Railway, Heroku, DigitalOcean, AWS
```

### **Local Network Deployment**
```bash
# Network-wide access
./setup-local-network.sh
# Access from any device on network
```

## 🔄 Scalability Considerations

### **Multi-Vehicle Support**
- **Vehicle IDs:** Unique identifiers
- **Command Routing:** Per-vehicle queues
- **Dashboard Tabs:** Vehicle selection
- **Database:** Vehicle state persistence

### **Sensor Expansion**
- **Plugin Architecture:** Modular sensor support
- **Data Pipeline:** Streaming processing
- **Storage:** Time-series database
- **Analytics:** Machine learning integration

## 🎯 Future Enhancements

### **Planned Features**
- **Autonomous Navigation:** Path planning
- **Computer Vision:** Object detection
- **Voice Control:** Speech recognition
- **Mobile App:** Native mobile interface

### **Technical Improvements**
- **Docker Containers:** Easier deployment
- **Microservices:** Service separation
- **Load Balancing:** High availability
- **Monitoring:** System health checks

This architecture provides a robust, scalable foundation for the Mission Control system with room for future enhancements.

# MPU6050 Sensor Integration for Mission Control

This directory contains the MPU6050/MPU9250 sensor integration for the Advanced Mission Control system. The MPU6050 provides 6-axis motion tracking (3-axis accelerometer + 3-axis gyroscope) for vehicle orientation and motion detection.

## 📁 Files Overview

- `mpu6050_reader.py` - Core MPU6050 sensor reading class (ported from backup)
- `mpu_sensor_service.py` - Network service for MPU data (TCP/UDP streaming)
- `mpu_http_server.py` - HTTP server with REST API and web dashboard
- `test_mpu_integration.py` - Integration test script
- `start_mpu_service.sh` - Startup script for MPU services
- `requirements.txt` - Python dependencies
- `install_dependencies.sh` - Dependency installation (from backup)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install I2C tools and Python packages
sudo apt update
sudo apt install i2c-tools python3-pip -y
pip3 install --break-system-packages -r requirements.txt
```

### 2. Enable I2C
```bash
# Enable I2C interface
sudo raspi-config
# Navigate to: Interface Options -> I2C -> Enable
sudo reboot
```

### 3. Check Hardware Connection
```bash
# Check if MPU6050 is detected at address 0x68
i2cdetect -y 1
```

### 4. Start MPU Service
```bash
# Start the integrated MPU service
./start_mpu_service.sh
```

## 🌐 API Endpoints

### MPU HTTP Server (Port 8087)
- `http://172.20.10.4:8087/` - Web dashboard
- `http://172.20.10.4:8087/api/data` - Current sensor data (JSON)
- `http://172.20.10.4:8087/api/status` - Service status
- `http://172.20.10.4:8087/api/stream` - Server-sent events stream

### Mission Control Integration (Port 3001)
- `http://172.20.10.4:3001/api/mpu/data` - MPU data via mission control
- `http://172.20.10.4:3001/api/status` - System status (includes IMU)

## 📊 Data Format

### Sensor Data Response
```json
{
  "timestamp": "2025-09-07T12:43:00.000Z",
  "sensor_type": "mpu6050",
  "data": {
    "ax": 0.12,          // X-axis acceleration (g)
    "ay": -0.05,         // Y-axis acceleration (g)
    "az": 0.98,          // Z-axis acceleration (g)
    "gx": 1.2,           // X-axis gyroscope (°/s)
    "gy": -0.8,          // Y-axis gyroscope (°/s)  
    "gz": 0.3,           // Z-axis gyroscope (°/s)
    "temp": 24.5,        // Temperature (°C)
    "roll": 7.2,         // Roll angle (°)
    "pitch": -3.1,       // Pitch angle (°)
    "jerk": 0,           // Jerk detection (0/1)
    "accel_mag": 0.99    // Total acceleration magnitude (g)
  },
  "status": "active"
}
```

## 🔧 Hardware Setup

### MPU6050 Wiring (Raspberry Pi)
```
MPU6050    Raspberry Pi
VCC    <-> 3.3V (Pin 1)
GND    <-> GND (Pin 6)
SDA    <-> GPIO 2 (Pin 3) - I2C Data
SCL    <-> GPIO 3 (Pin 5) - I2C Clock
```

### I2C Configuration
- Default I2C bus: 1
- MPU6050 default address: 0x68
- Pi 5 may use different bus numbers (4, 6, 10, 11, 13, 14)

## 🧪 Testing

### Basic Integration Test
```bash
cd /home/adv/Desktop/adv_mission_control/pi_controller/mpu
python3 test_mpu_integration.py
```

### Continuous Monitoring
```bash
python3 test_mpu_integration.py monitor
```

### Manual Testing
```bash
# Test MPU service directly
curl http://127.0.0.1:8087/api/data

# Test mission control integration
curl http://127.0.0.1:3001/api/mpu/data
```

## 🔄 Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MPU6050       │    │  MPU Service    │    │ Mission Control │
│   Hardware      │<-->│  (Port 8087)    │<-->│  (Port 3001)    │
│                 │    │                 │    │                 │
│ • Accelerometer │    │ • HTTP API      │    │ • WebSocket     │
│ • Gyroscope     │    │ • TCP Stream    │    │ • REST API      │
│ • Temperature   │    │ • UDP Broadcast │    │ • Frontend      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Features

### Sensor Capabilities
- ✅ 3-axis accelerometer (±2g, ±4g, ±8g, ±16g)
- ✅ 3-axis gyroscope (±250, ±500, ±1000, ±2000 °/s)
- ✅ Temperature sensor
- ✅ Roll/pitch calculation
- ✅ Jerk detection for sudden movements
- ✅ Real-time data streaming

### Network Services
- ✅ HTTP REST API
- ✅ TCP real-time streaming
- ✅ UDP broadcast
- ✅ Web dashboard
- ✅ Mission control integration

### Mission Control Integration
- ✅ IMU data in system status
- ✅ Real-time sensor updates
- ✅ Hardware status monitoring
- ✅ WebSocket broadcasting

## 🔍 Troubleshooting

### Common Issues

1. **MPU6050 not detected**
   ```bash
   # Check I2C tools
   sudo apt install i2c-tools
   
   # Check I2C is enabled
   sudo raspi-config
   
   # Scan for devices
   i2cdetect -y 1
   ```

2. **Permission errors**
   ```bash
   # Add user to i2c group
   sudo usermod -a -G i2c $USER
   
   # Install packages without sudo
   pip3 install --break-system-packages mpu6050-raspberrypi
   ```

3. **Wrong I2C bus (Pi 5)**
   ```bash
   # Try different buses
   i2cdetect -y 4
   i2cdetect -y 6
   i2cdetect -y 10
   ```

4. **Service won't start**
   ```bash
   # Check dependencies
   pip3 install --break-system-packages -r requirements.txt
   
   # Check ports
   netstat -tulpn | grep :8087
   
   # Check logs
   python3 mpu_http_server.py
   ```

## 📝 Configuration

### Update Rate
Default: 10 Hz (configurable in `mpu_sensor_service.py`)

### Jerk Sensitivity
Default: 0.6g (configurable in `mpu6050_reader.py`)

### Network Ports
- HTTP Server: 8087
- TCP Stream: 8085  
- UDP Broadcast: 8086

## 🔗 Integration Points

The MPU sensor integrates with:
1. **Hardware Controller** - Real-time IMU data updates
2. **WebSocket Service** - Live sensor broadcasting  
3. **REST API** - HTTP access to sensor data
4. **Frontend Dashboard** - Visual sensor display
5. **System Status** - Hardware monitoring

## 📈 Performance

- **Update Rate**: Up to 100 Hz
- **Latency**: <10ms local network
- **Accuracy**: ±2° for roll/pitch
- **Temperature**: ±1°C accuracy
- **Power**: ~3.9mA @ 3.3V

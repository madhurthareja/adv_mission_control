# Quick Start Guide

## 🎯 Getting Started in 5 Minutes

### 1. **Backend Setup** (Your Laptop)
```bash
# Start backend server
cd server
npm install
npm run dev
# Backend running on http://localhost:3001
```

### 2. **Frontend Setup** (Your Laptop)
```bash
# Start frontend dashboard
npm install
npm run dev
# Dashboard running on http://localhost:3000
```

### 3. **Hardware Connection**

**Raspberry Pi 5:**
- Connect 4 USB cameras to Pi5
- Connect ESP32 to Pi via UART (GPIO 14/15)
- Run: `python3 pi_controller/main.py`

**ESP32:**
- Upload `esp32_firmware/vehicle_control.ino`
- Connect L298N motor driver
- Connect analog joystick for manual override

## 🔧 Development vs Production

### Development Mode (Laptop as Server)
```bash
# Your laptop acts as the server
./start-dev.sh
# Access: http://localhost:3000
```

### Production Mode (Cloud Deployment)
```bash
# Deploy to cloud platform
./setup-cloud-deployment.sh
# Access from anywhere via public URL
```

## 📱 Access Points

- **Web Dashboard:** http://localhost:3000
- **WebSocket API:** ws://localhost:3001
- **Pi Controller:** 192.168.1.100 (if static IP set)
- **Mobile Access:** Same network, use laptop IP

## 🎮 Controls

- **Virtual Joystick:** Web dashboard control interface
- **Physical Joystick:** Connected to ESP32 (manual override)
- **Emergency Stop:** Physical button + web interface
- **Camera Selection:** 4-camera grid with individual controls

## 🔍 Monitoring

- **System Status:** Real-time in web dashboard
- **Sensor Data:** Temperature, battery, connectivity
- **LIDAR:** 360° obstacle detection and mapping
- **Logs:** Backend console and Pi controller output

Need help? Check `docs/hardware-setup.md` for detailed instructions!

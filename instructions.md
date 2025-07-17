# Development Instructions: Mission Control GUI System

This document outlines how to set up, develop, and test the components of the Mission Control system, including frontend, backend, Raspberry Pi controller, and ESP32 firmware.

---

## 🧱 Project Structure

adv_mission_control/
├── src/                    # React frontend components
│   ├── components/         # Reusable UI components
│   ├── pages/             # Dashboard pages
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and WebSocket services
│   └── types/             # TypeScript type definitions
├── server/                # Node.js backend server
│   ├── routes/            # API routes
│   ├── websocket/         # WebSocket handlers
│   ├── hardware/          # Hardware communication
│   └── middleware/        # Auth and validation
├── pi_controller/         # Raspberry Pi code (sensors + control)
├── esp32_firmware/        # ESP32 sketch code
├── docs/                  # Diagrams, specs, planning files
├── instructions.md        # Dev instructions (this file)
└── plan.md               # High-level roadmap and milestones


---

## 🔧 Local Development Setup

### 1. Frontend (React + TypeScript + Vite)

#### Requirements:
- Node.js ≥ 18.x
- TypeScript
- Vite (already configured)

#### Steps:
```bash
# Install dependencies
npm install

# Add additional packages for dashboard
npm install socket.io-client @types/socket.io-client
npm install react-router-dom @types/react-router-dom
npm install @emotion/react @emotion/styled
npm install recharts # for sensor data visualization

# Start development server
npm run dev
```

#### Features to implement:
- 4-panel video feed display
- Real-time sensor data dashboard
- Joystick/keyboard control interface
- System status monitoring
- WebSocket connection management

### 2. Backend (Node.js + Express + Socket.IO)

#### Requirements:
- Node.js ≥ 18.x
- Express.js
- Socket.IO for real-time communication
- Serial communication for Pi/ESP32

#### Setup:
```bash
# Create server directory and setup
mkdir server && cd server
npm init -y
npm install express socket.io cors dotenv
npm install serialport ws
npm install @types/node @types/express typescript ts-node nodemon --save-dev

# Start development server
npm run dev
```

#### Backend Architecture:
- WebSocket server for real-time control
- REST API for configuration
- Serial/UART communication with hardware
- Command buffering and priority handling
- Video stream proxy/relay
3. Raspberry Pi Controller (Python)
Requirements:

Python 3.10+
ffmpeg, libcamera, v4l-utils
RPi.GPIO, smbus2, pyserial, socketio-client
Setup:

cd pi_controller
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
Ensure video stream ports match those in frontend .env
Use tmux or systemd for service persistence
4. ESP32 Firmware
Requirements:

Arduino IDE or ESP-IDF
Libraries: L298N, Adafruit_NeoPixel, Wire, etc.
Steps:

Open esp32_firmware/vehicle_control.ino in Arduino IDE
Set board to ESP32 Dev Module
Upload via USB or OTA
Serial baud: 115200
🧪 Testing Instructions

Local End-to-End Test (LAN Only)
Run frontend locally
Run backend on Pi or laptop
Run pi_controller/main.py
Connect to IP: localhost:3000 and test controls
Serial log ESP32 and verify joystick override logic
🔄 Useful Commands

# Restart Pi streaming (front cam)
libcamera-vid --width 1920 --height 1080 --framerate 50 -t 0 --inline --codec mjpeg -o - | \
ffmpeg -f mjpeg -i - -f mpegts udp://<MC_IP>:5000

# Check camera detection
v4l2-ctl --list-devices

# ESP32 Serial Monitor
screen /dev/ttyUSB0 115200
🔐 Dev Secrets

Do NOT commit .env, WiFi passwords, or tokens
Use git-crypt or .env.example for sharing secrets
🛠️ Dev Tips

Use tmux on Pi to keep scripts running
Use VSCode Remote SSH plugin for Pi
ESP32 logic should always default to joystick if active
Log joystick status + Pi commands for debugging
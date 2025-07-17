# Hardware Setup Guide for Mission Control System

## 🔧 Required Hardware

### Raspberry Pi 5 Setup
- **Raspberry Pi 5** (8GB recommended)
- **MicroSD Card** (64GB+, Class 10)
- **4x USB Cameras** (1080p recommended)
- **USB Hub** (powered, 7+ ports)
- **Power Supply** (5V/5A official Pi power supply)

### ESP32 Setup
- **ESP32 Dev Board** (ESP32-WROOM-32)
- **L298N Motor Driver** (dual H-bridge)
- **Analog Joystick Module** (X/Y axis + button)
- **DC Motors** (2x for differential drive)
- **Jumper Wires** and **Breadboard**
- **12V Battery Pack** (for motors)

### Sensors (Optional)
- **LIDAR Sensor** (RPLidar A1/A2)
- **IMU Sensor** (MPU-6050/BNO055)
- **Temperature Sensor** (DS18B20)
- **Battery Monitor** (INA219)

## 📡 Wiring Diagrams

### ESP32 to L298N Motor Driver
```
ESP32 Pin    →    L298N Pin
GPIO 18      →    IN1 (Motor A)
GPIO 19      →    IN2 (Motor A)
GPIO 20      →    IN3 (Motor B)
GPIO 21      →    IN4 (Motor B)
GPIO 22      →    ENA (Motor A PWM)
GPIO 23      →    ENB (Motor B PWM)
GND          →    GND
```

### ESP32 to Joystick
```
ESP32 Pin    →    Joystick Pin
GPIO 34      →    X-axis (VRX)
GPIO 35      →    Y-axis (VRY)
GPIO 32      →    Button (SW)
3.3V         →    VCC
GND          →    GND
```

### Raspberry Pi 5 to ESP32
```
Pi Pin       →    ESP32 Pin
GPIO 14 (TX) →    GPIO 16 (RX)
GPIO 15 (RX) →    GPIO 17 (TX)
GND          →    GND
```

## 🚀 Setup Instructions

### 1. Raspberry Pi 5 Setup

1. **Install Raspberry Pi OS:**
   ```bash
   # Flash Raspberry Pi OS (64-bit) to SD card
   # Enable SSH and set hostname to 'mission-control-pi'
   ```

2. **Update system:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install python3-pip git ffmpeg v4l-utils
   ```

3. **Install Python dependencies:**
   ```bash
   cd /home/pi
   git clone <your-repo-url>
   cd mission-control/pi_controller
   pip3 install -r requirements.txt
   ```

4. **Test cameras:**
   ```bash
   # List available cameras
   v4l2-ctl --list-devices
   
   # Test camera capture
   fswebcam -d /dev/video0 test.jpg
   ```

5. **Configure network:**
   ```bash
   # Set static IP (optional)
   sudo nano /etc/dhcpcd.conf
   # Add:
   # interface wlan0
   # static ip_address=192.168.1.100/24
   # static routers=192.168.1.1
   # static domain_name_servers=8.8.8.8
   ```

### 2. ESP32 Setup

1. **Install Arduino IDE:**
   - Download from arduino.cc
   - Install ESP32 board support
   - Install ArduinoJson library

2. **Upload firmware:**
   ```cpp
   // Open vehicle_control.ino in Arduino IDE
   // Select Board: ESP32 Dev Module
   // Select Port: /dev/ttyUSB0 (or appropriate port)
   // Click Upload
   ```

3. **Test serial communication:**
   ```bash
   # Monitor serial output
   screen /dev/ttyUSB0 115200
   
   # Send test command
   {"cmd":"move","forward":50,"turn":0,"speed":75,"brake":false}
   ```

### 3. Backend Deployment Options

#### Option A: Local Network (Recommended for Development)
```bash
# Run on your laptop
cd mission-control
chmod +x setup-local-network.sh
./setup-local-network.sh

# Start backend
cd server && npm run dev

# Start frontend
npm run dev
```

#### Option B: Cloud Deployment
```bash
# Choose cloud platform
chmod +x setup-cloud-deployment.sh
./setup-cloud-deployment.sh
```

### 4. System Integration

1. **Connect hardware:**
   - Connect cameras to Pi via USB hub
   - Connect ESP32 to Pi via UART
   - Connect motors to L298N
   - Connect joystick to ESP32

2. **Configure network IPs:**
   ```bash
   # Update pi_controller/main.py
   self.backend_url = "http://YOUR_LAPTOP_IP:3001"
   
   # Update frontend .env
   VITE_WEBSOCKET_URL=http://YOUR_LAPTOP_IP:3001
   ```

3. **Start system:**
   ```bash
   # On Pi
   cd /home/pi/mission-control/pi_controller
   python3 main.py
   
   # On laptop
   cd mission-control
   ./start-dev.sh
   ```

## 🔧 Troubleshooting

### Camera Issues
```bash
# Check camera permissions
sudo usermod -a -G video pi

# Test camera devices
for i in {0..7}; do
  if [ -e /dev/video$i ]; then
    echo "Camera found: /dev/video$i"
    v4l2-ctl -d /dev/video$i --list-formats
  fi
done
```

### Serial Communication Issues
```bash
# Check ESP32 connection
dmesg | grep tty

# Test serial communication
sudo minicom -D /dev/ttyUSB0 -b 115200
```

### Network Issues
```bash
# Check Pi network
ip addr show wlan0
ping YOUR_LAPTOP_IP

# Check firewall
sudo ufw status
sudo ufw allow 3001/tcp
```

## 📊 Performance Optimization

### Camera Streaming
```bash
# Optimize camera settings
v4l2-ctl -d /dev/video0 --set-fmt-video=width=640,height=480,pixelformat=MJPG

# Adjust ffmpeg parameters
ffmpeg -f v4l2 -framerate 30 -video_size 640x480 -i /dev/video0 -c:v libx264 -preset ultrafast -tune zerolatency -f mpegts udp://192.168.1.10:8080
```

### System Resources
```bash
# Monitor system performance
htop
iostat -x 1
```

## 🔒 Security Considerations

1. **Network Security:**
   - Use WPA3 for WiFi
   - Set up firewall rules
   - Use SSH key authentication

2. **Emergency Stop:**
   - Physical emergency stop button
   - Watchdog timer on ESP32
   - Remote kill switch

3. **Access Control:**
   - Password protect web interface
   - Rate limit control commands
   - Log all activities

## 📱 Mobile Access

To access from mobile devices:
1. Ensure all devices are on same network
2. Access `http://YOUR_LAPTOP_IP:3000`
3. Dashboard is mobile-responsive
4. Touch controls work on mobile

## 🎯 Testing Checklist

- [ ] All cameras detected and streaming
- [ ] ESP32 receiving commands from Pi
- [ ] Joystick override working
- [ ] Motor control responding
- [ ] Emergency stop functional
- [ ] Web interface accessible
- [ ] Real-time sensor data updating
- [ ] Network connectivity stable

#!/bin/bash

# Mission Control Setup Script for IP 172.20.10.4
# Run this script on the Raspberry Pi to configure everything

set -e

echo "🚀 Setting up Mission Control for IP 172.20.10.4"
echo "================================================="

# Check if we're on a Raspberry Pi
if ! command -v rpicam-hello &> /dev/null; then
    echo "⚠️  Warning: rpicam tools not found. Make sure you're on a Raspberry Pi with camera support."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p ~/mission_control_logs
mkdir -p ~/mission_control_config

# Copy environment configuration
echo "⚙️  Setting up environment..."
cp .env.172 .env
echo "✅ Environment configured for 172.20.10.4"

# Install Python dependencies for camera streaming
echo "📦 Installing Python dependencies..."
pip3 install opencv-python || echo "⚠️  OpenCV installation failed - USB cameras may not work"

# Check camera detection
echo "📹 Detecting cameras..."
echo "Pi cameras:"
rpicam-hello --list-cameras 2>/dev/null || echo "No Pi cameras detected"

echo "USB cameras:"
v4l2-ctl --list-devices 2>/dev/null || echo "v4l2-utils not installed"

# Set up systemd services for auto-start
echo "🔧 Setting up systemd services..."

# MPU API Server service
cat > ~/mission_control_config/mpu-api.service << 'EOF'
[Unit]
Description=Mission Control MPU API Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Desktop/adv_mission_control/pi_controller
ExecStart=/usr/bin/python3 mpu_api_server.py
Restart=always
RestartSec=5
Environment=PYTHONPATH=/home/pi/Desktop/adv_mission_control/pi_controller

[Install]
WantedBy=multi-user.target
EOF

# Camera Streamer service  
cat > ~/mission_control_config/camera-streamer.service << 'EOF'
[Unit]
Description=Mission Control Camera Streamer
After=network.target mpu-api.service
Wants=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Desktop/adv_mission_control/pi_controller
ExecStart=/usr/bin/python3 simple_camera_streamer.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/home/pi/Desktop/adv_mission_control/pi_controller

[Install]
WantedBy=multi-user.target
EOF

# Main Pi Controller service
cat > ~/mission_control_config/pi-controller.service << 'EOF'
[Unit]
Description=Mission Control Pi Controller
After=network.target mpu-api.service camera-streamer.service
Wants=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Desktop/adv_mission_control/pi_controller
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/home/pi/Desktop/adv_mission_control/pi_controller

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service files created in ~/mission_control_config/"
echo ""
echo "To install services, run:"
echo "  sudo cp ~/mission_control_config/*.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable mpu-api camera-streamer pi-controller"
echo "  sudo systemctl start mpu-api camera-streamer pi-controller"

# Create startup script
cat > ~/mission_control_config/start_mission_control.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Mission Control Services"

# Start MPU API Server
echo "Starting MPU API Server..."
cd /home/pi/Desktop/adv_mission_control/pi_controller
python3 mpu_api_server.py &
MPU_PID=$!
echo "MPU API Server started (PID: $MPU_PID)"

# Wait a moment
sleep 2

# Start Camera Streamer  
echo "Starting Camera Streamer..."
python3 simple_camera_streamer.py &
CAMERA_PID=$!
echo "Camera Streamer started (PID: $CAMERA_PID)"

# Wait a moment
sleep 2

# Start Main Pi Controller
echo "Starting Pi Controller..."
python3 main.py &
MAIN_PID=$!
echo "Pi Controller started (PID: $MAIN_PID)"

echo ""
echo "✅ All services started!"
echo "🌐 Camera streams: http://172.20.10.4:8080/"
echo "🔗 MPU API: http://172.20.10.4:8087/api/data"
echo "📡 Pi Controller WebSocket: Connected to backend"
echo ""
echo "To stop all services:"
echo "  kill $MPU_PID $CAMERA_PID $MAIN_PID"

# Create PID file
echo "$MPU_PID $CAMERA_PID $MAIN_PID" > ~/mission_control_logs/pids.txt

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping services..."; kill $MPU_PID $CAMERA_PID $MAIN_PID; exit' INT TERM

wait
EOF

chmod +x ~/mission_control_config/start_mission_control.sh

echo "✅ Startup script created: ~/mission_control_config/start_mission_control.sh"

# Create network configuration info
cat > ~/mission_control_config/network_info.txt << 'EOF'
Mission Control Network Configuration for 172.20.10.4
====================================================

Services and Ports:
- Main Backend Server: 172.20.10.4:3001
- Camera Routing Server: 172.20.10.4:8080  
- MPU API Server: 172.20.10.4:8087
- Individual Camera Ports:
  * Front Pi Camera: 172.20.10.4:8082
  * Back Pi Camera: 172.20.10.4:8083
  * Left USB Camera: 172.20.10.4:8084
  * Right USB Camera: 172.20.10.4:8085

Frontend Access:
- Main Dashboard: http://172.20.10.4:3000
- Backend API: http://172.20.10.4:3001

Camera Stream URLs:
- All cameras: http://172.20.10.4:8080/{front|back|left|right}
- Status: http://172.20.10.4:8080/status

MPU Sensor Data:
- API endpoint: http://172.20.10.4:8087/api/data
- Status: http://172.20.10.4:8087/api/status
EOF

echo "📋 Network configuration saved to ~/mission_control_config/network_info.txt"

echo ""
echo "🎯 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Make sure cameras are connected"
echo "2. Run: ~/mission_control_config/start_mission_control.sh"
echo "3. Or install systemd services for auto-start"
echo "4. Access dashboard at: http://172.20.10.4:3000"
echo ""
echo "Troubleshooting:"
echo "- Check logs in ~/mission_control_logs/"
echo "- Test cameras: rpicam-hello --list-cameras"
echo "- Test USB cameras: v4l2-ctl --list-devices"
echo "- Check network: ping 172.20.10.4"

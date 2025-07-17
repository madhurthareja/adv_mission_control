#!/bin/bash

# Mission Control - Local Network Setup Script

echo "🏠 Setting up Local Network Deployment"
echo "====================================="

# Get local IP address
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | cut -d' ' -f1)
echo "📡 Local IP: $LOCAL_IP"

# Create environment file for server
cat > server/.env << EOF
# Local Network Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://$LOCAL_IP:3000

# Hardware Configuration
SERIAL_PORT=/dev/ttyUSB0
SERIAL_BAUDRATE=115200

# Pi Configuration (Update this with your Pi's IP)
PI_IP=192.168.1.100
PI_SSH_USER=pi

# Video Stream Configuration
VIDEO_STREAM_PORT=8080
VIDEO_QUALITY=high

# Security
JWT_SECRET=local-dev-secret-key
SESSION_TIMEOUT=3600000
EOF

echo "✅ Created server/.env with local network configuration"

# Update Pi controller with backend IP
echo "📝 Update pi_controller/main.py with backend URL:"
echo "   Change 'YOUR_BACKEND_SERVER' to '$LOCAL_IP'"

# Start instructions
echo ""
echo "🚀 Deployment Steps:"
echo "1. Run backend on your laptop:"
echo "   cd server && npm run dev"
echo ""
echo "2. Run frontend on your laptop:"
echo "   npm run dev"
echo ""
echo "3. Upload ESP32 firmware to your ESP32"
echo ""
echo "4. Copy pi_controller/ to your Raspberry Pi and run:"
echo "   python3 main.py"
echo ""
echo "5. Access dashboard from any device on network:"
echo "   http://$LOCAL_IP:3000"

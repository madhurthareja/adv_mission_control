#!/bin/bash

# Mission Control - Internet Access Setup Script

echo "🌐 Setting up Internet Access for Mission Control"
echo "=============================================="

# Function to get local IP address
get_local_ip() {
    local ip=$(hostname -I | awk '{print $1}')
    echo $ip
}

# Function to generate API key
generate_api_key() {
    openssl rand -hex 32
}

# Get current IP
LOCAL_IP=$(get_local_ip)
echo "📍 Detected local IP: $LOCAL_IP"

# Generate API key if not exists
if [ ! -f "server/.env.production" ] || ! grep -q "API_KEY=" server/.env.production; then
    API_KEY=$(generate_api_key)
    echo "🔐 Generated new API key: $API_KEY"
else
    API_KEY=$(grep "API_KEY=" server/.env.production | cut -d'=' -f2)
    echo "🔐 Using existing API key"
fi

# Create production environment file
cat > server/.env.production << EOF
# Mission Control Server Configuration - Internet Access
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security Configuration
API_KEY=$API_KEY

# Network Configuration
PUBLIC_URL=http://$LOCAL_IP:3001
FRONTEND_URL=http://$LOCAL_IP:3000
CAMERA_STREAM_BASE_URL=http://$LOCAL_IP

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://$LOCAL_IP:3000,http://127.0.0.1:3000

# Security Settings
ENABLE_INTERNET_ACCESS=true
ENABLE_RATE_LIMITING=true
MAX_CONNECTIONS_PER_IP=10
SESSION_TIMEOUT=30
EOF

echo "✅ Created production environment configuration"

# Update frontend for internet access
echo "🌐 Updating frontend configuration..."

# Create frontend environment file
cat > .env.production << EOF
# Frontend Configuration for Internet Access
VITE_BACKEND_URL=http://$LOCAL_IP:3001
VITE_WS_URL=ws://$LOCAL_IP:3001
VITE_API_KEY=$API_KEY

# Camera Stream URLs
VITE_FRONT_CAMERA_URL=http://$LOCAL_IP:8082/stream
VITE_BACK_CAMERA_URL=http://$LOCAL_IP:8081/stream
VITE_LEFT_CAMERA_URL=http://$LOCAL_IP:8080/stream
VITE_RIGHT_CAMERA_URL=http://$LOCAL_IP:8083/stream
EOF

echo "✅ Created frontend environment configuration"

# Configure firewall (UFW)
echo "🔥 Configuring firewall..."

# Install UFW if not installed
if ! command -v ufw &> /dev/null; then
    sudo apt update && sudo apt install -y ufw
fi

# Configure UFW rules
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow Mission Control Server
sudo ufw allow 3001/tcp comment "Mission Control Backend"

# Allow Frontend
sudo ufw allow 3000/tcp comment "Mission Control Frontend"

# Allow Camera Streams
sudo ufw allow 8080:8083/tcp comment "Camera Streams"

# Enable UFW
sudo ufw --force enable

echo "✅ Firewall configured"

# Network information
echo ""
echo "🌐 Internet Access Configuration Complete!"
echo "=========================================="
echo ""
echo "📍 Local Network Access:"
echo "   Backend:  http://$LOCAL_IP:3001"
echo "   Frontend: http://$LOCAL_IP:3000"
echo ""
echo "🔐 API Key: $API_KEY"
echo "   (Add this to your client requests as 'x-api-key' header)"
echo ""
echo "📡 Camera Streams:"
echo "   Front: http://$LOCAL_IP:8082/stream"
echo "   Back:  http://$LOCAL_IP:8081/stream"
echo "   Left:  http://$LOCAL_IP:8080/stream"
echo "   Right: http://$LOCAL_IP:8083/stream"
echo ""
echo "🔧 To start the internet-accessible server:"
echo "   cd server && npm run start:production"
echo ""
echo "🌍 To access from internet:"
echo "   1. Configure your router for port forwarding:"
echo "      - Forward port 3001 to $LOCAL_IP:3001 (Backend)"
echo "      - Forward port 3000 to $LOCAL_IP:3000 (Frontend)"
echo "      - Forward ports 8080-8083 to $LOCAL_IP:8080-8083 (Cameras)"
echo "   2. Update PUBLIC_URL in .env.production with your public IP"
echo "   3. Use your public IP to access: http://YOUR_PUBLIC_IP:3000"
echo ""
echo "⚠️  Security Notes:"
echo "   - Keep your API key secret"
echo "   - Consider using HTTPS in production"
echo "   - Monitor access logs regularly"
echo "   - Change default API key for production use"
echo ""

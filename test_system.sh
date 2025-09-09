#!/bin/bash

# Quick Test Script for Mission Control on 172.20.10.4
# Run this to verify everything is working

echo "🧪 Mission Control Quick Test"
echo "============================="

# Test network connectivity
echo "📡 Testing network connectivity..."
if ping -c 1 172.20.10.4 &> /dev/null; then
    echo "✅ Network: 172.20.10.4 is reachable"
else
    echo "❌ Network: Cannot reach 172.20.10.4"
    exit 1
fi

# Test camera detection
echo ""
echo "📹 Testing camera detection..."
echo "Pi cameras:"
if command -v rpicam-hello &> /dev/null; then
    rpicam-hello --list-cameras 2>/dev/null || echo "No Pi cameras detected"
else
    echo "rpicam tools not available"
fi

echo "USB cameras:"
if command -v v4l2-ctl &> /dev/null; then
    v4l2-ctl --list-devices 2>/dev/null || echo "No USB cameras detected"
else
    echo "v4l2-utils not installed"
fi

# Test Python dependencies
echo ""
echo "🐍 Testing Python dependencies..."
python3 -c "import cv2; print('✅ OpenCV available')" 2>/dev/null || echo "❌ OpenCV not available"
python3 -c "import flask; print('✅ Flask available')" 2>/dev/null || echo "❌ Flask not available"
python3 -c "import requests; print('✅ Requests available')" 2>/dev/null || echo "❌ Requests not available"

# Test if services are running
echo ""
echo "🔍 Checking running services..."

# Check if camera streamer is running
if pgrep -f "simple_camera_streamer.py" > /dev/null; then
    echo "✅ Camera Streamer: Running"
else
    echo "❌ Camera Streamer: Not running"
fi

# Check if MPU API is running
if pgrep -f "mpu_api_server.py" > /dev/null; then
    echo "✅ MPU API Server: Running"
else
    echo "❌ MPU API Server: Not running"
fi

# Check if main controller is running
if pgrep -f "main.py" > /dev/null; then
    echo "✅ Main Controller: Running"
else
    echo "❌ Main Controller: Not running"
fi

# Test HTTP endpoints
echo ""
echo "🌐 Testing HTTP endpoints..."

# Test camera routing server
if curl -s --connect-timeout 3 http://172.20.10.4:8080/status > /dev/null 2>&1; then
    echo "✅ Camera Routing Server (8080): Responding"
else
    echo "❌ Camera Routing Server (8080): Not responding"
fi

# Test MPU API
if curl -s --connect-timeout 3 http://172.20.10.4:8087/api/status > /dev/null 2>&1; then
    echo "✅ MPU API Server (8087): Responding"
else
    echo "❌ MPU API Server (8087): Not responding"
fi

# Test main backend
if curl -s --connect-timeout 3 http://172.20.10.4:3001 > /dev/null 2>&1; then
    echo "✅ Main Backend (3001): Responding"
else
    echo "❌ Main Backend (3001): Not responding"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo "Services should be running on:"
echo "  Camera Streams: http://172.20.10.4:8080/"
echo "  MPU Data: http://172.20.10.4:8087/api/data"
echo "  Main Dashboard: http://172.20.10.4:3000"
echo ""
echo "If services are not running, start them with:"
echo "  ./setup_172.sh"
echo "  ~/mission_control_config/start_mission_control.sh"

#!/bin/bash

# Mission Control Development Startup Script

echo "🚀 Starting Mission Control Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm to continue."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo "✅ npm $(npm --version) detected"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Install server dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Create logs directory for server
mkdir -p server/logs

echo ""
echo "🎯 Starting services..."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "API:      http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start backend server in background
cd server && npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
cd .. && npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

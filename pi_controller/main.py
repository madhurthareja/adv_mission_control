#!/usr/bin/env python3
"""
Raspberry Pi 5 Controller for Mission Control System
Handles camera streaming, sensor reading, and ESP32 communication
"""

import asyncio
import json
import logging
import time
import subprocess
import threading
from typing import Dict, List, Optional
import socketio
import serial
import cv2
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CameraManager:
    def __init__(self):
        self.cameras = {
            'front': {'device': '/dev/video0', 'stream': None, 'active': False},
            'back': {'device': '/dev/video2', 'stream': None, 'active': False},
            'left': {'device': '/dev/video4', 'stream': None, 'active': False},
            'right': {'device': '/dev/video6', 'stream': None, 'active': False}
        }
        self.streaming_processes = {}
    
    def detect_cameras(self):
        """Detect available cameras"""
        logger.info("Detecting cameras...")
        available_cameras = []
        
        try:
            # List video devices
            result = subprocess.run(['v4l2-ctl', '--list-devices'], 
                                  capture_output=True, text=True)
            logger.info(f"Available cameras: {result.stdout}")
            
            # Test each camera
            for camera_name, camera_info in self.cameras.items():
                device = camera_info['device']
                try:
                    cap = cv2.VideoCapture(device)
                    if cap.isOpened():
                        available_cameras.append(camera_name)
                        logger.info(f"✅ {camera_name} camera detected at {device}")
                    else:
                        logger.warning(f"❌ {camera_name} camera not found at {device}")
                    cap.release()
                except Exception as e:
                    logger.error(f"Error testing {camera_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error detecting cameras: {e}")
        
        return available_cameras
    
    def start_camera_stream(self, camera_name: str, stream_url: str):
        """Start streaming for a specific camera"""
        if camera_name not in self.cameras:
            logger.error(f"Unknown camera: {camera_name}")
            return False
        
        device = self.cameras[camera_name]['device']
        
        # FFmpeg command for streaming
        cmd = [
            'ffmpeg',
            '-f', 'v4l2',
            '-i', device,
            '-f', 'mjpeg',
            '-r', '30',
            '-s', '640x480',
            '-q:v', '5',
            stream_url
        ]
        
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.streaming_processes[camera_name] = process
            self.cameras[camera_name]['active'] = True
            logger.info(f"✅ Started streaming {camera_name} camera")
            return True
        except Exception as e:
            logger.error(f"Failed to start {camera_name} stream: {e}")
            return False
    
    def stop_camera_stream(self, camera_name: str):
        """Stop streaming for a specific camera"""
        if camera_name in self.streaming_processes:
            process = self.streaming_processes[camera_name]
            process.terminate()
            process.wait()
            del self.streaming_processes[camera_name]
            self.cameras[camera_name]['active'] = False
            logger.info(f"🛑 Stopped streaming {camera_name} camera")
    
    def get_camera_status(self):
        """Get status of all cameras"""
        return {name: info['active'] for name, info in self.cameras.items()}

class SensorManager:
    def __init__(self):
        self.sensors = {
            'lidar': None,
            'imu': None,
            'battery': None,
            'temperature': None
        }
    
    def read_sensors(self) -> Dict:
        """Read all sensor data"""
        # Mock data for now - replace with actual sensor reading
        return {
            'lidar': {
                'distance': 150 + np.random.randint(-50, 50),
                'angle': np.random.randint(0, 360),
                'obstacles': []
            },
            'imu': {
                'acceleration': {'x': np.random.randn(), 'y': np.random.randn(), 'z': 9.8},
                'gyroscope': {'x': np.random.randn(), 'y': np.random.randn(), 'z': np.random.randn()},
                'magnetometer': {'x': np.random.randn() * 100, 'y': np.random.randn() * 100, 'z': np.random.randn() * 100}
            },
            'battery': {
                'voltage': 12.0 + np.random.random() * 2,
                'current': np.random.random() * 5,
                'percentage': 80 + np.random.random() * 20
            },
            'temperature': 25 + np.random.random() * 10
        }

class ESP32Controller:
    def __init__(self, port: str = '/dev/ttyUSB0', baudrate: int = 115200):
        self.port = port
        self.baudrate = baudrate
        self.serial_connection = None
        self.connect()
    
    def connect(self):
        """Connect to ESP32 via serial"""
        try:
            self.serial_connection = serial.Serial(
                self.port, 
                self.baudrate, 
                timeout=1
            )
            logger.info(f"✅ Connected to ESP32 at {self.port}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to ESP32: {e}")
            return False
    
    def send_control_command(self, control_data: Dict):
        """Send vehicle control command to ESP32"""
        if not self.serial_connection:
            logger.error("ESP32 not connected")
            return False
        
        try:
            # Format: {"cmd":"move","forward":50,"turn":0,"speed":75,"brake":false}
            command = {
                "cmd": "move",
                "forward": control_data.get('forward', 0),
                "turn": control_data.get('turn', 0),
                "speed": control_data.get('speed', 50),
                "brake": control_data.get('brake', False)
            }
            
            message = json.dumps(command) + '\n'
            self.serial_connection.write(message.encode())
            logger.info(f"Sent to ESP32: {command}")
            return True
        except Exception as e:
            logger.error(f"Failed to send command to ESP32: {e}")
            return False
    
    def send_system_command(self, command: str):
        """Send system command to ESP32"""
        if not self.serial_connection:
            return False
        
        try:
            message = json.dumps({"cmd": command}) + '\n'
            self.serial_connection.write(message.encode())
            logger.info(f"Sent system command: {command}")
            return True
        except Exception as e:
            logger.error(f"Failed to send system command: {e}")
            return False

class MissionControlPi:
    def __init__(self):
        self.camera_manager = CameraManager()
        self.sensor_manager = SensorManager()
        self.esp32_controller = ESP32Controller()
        
        # WebSocket connection to backend
        self.sio = socketio.AsyncClient()
        self.backend_url = "http://YOUR_BACKEND_SERVER:3001"  # Update this
        
        self.setup_websocket_handlers()
        self.running = False
    
    def setup_websocket_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.sio.event
        async def connect():
            logger.info("✅ Connected to Mission Control backend")
            # Send initial status
            await self.send_system_status()
        
        @self.sio.event
        async def disconnect():
            logger.info("❌ Disconnected from Mission Control backend")
        
        @self.sio.on('vehicle_control')
        async def handle_vehicle_control(data):
            logger.info(f"Received vehicle control: {data}")
            control_data = data.get('data', {})
            self.esp32_controller.send_control_command(control_data)
        
        @self.sio.on('system_command')
        async def handle_system_command(data):
            logger.info(f"Received system command: {data}")
            command_data = data.get('data', {})
            await self.handle_system_command(command_data)
    
    async def handle_system_command(self, command_data: Dict):
        """Handle system commands from backend"""
        command = command_data.get('command')
        payload = command_data.get('payload', {})
        
        if command == 'emergency_stop':
            self.esp32_controller.send_system_command('emergency_stop')
        elif command == 'toggle_video_stream':
            stream_name = payload.get('stream')
            if stream_name:
                await self.toggle_video_stream(stream_name)
        elif command == 'set_control_mode':
            mode = payload.get('mode')
            self.esp32_controller.send_system_command(f'set_mode:{mode}')
    
    async def toggle_video_stream(self, stream_name: str):
        """Toggle video stream on/off"""
        if self.camera_manager.cameras[stream_name]['active']:
            self.camera_manager.stop_camera_stream(stream_name)
        else:
            stream_url = f"udp://YOUR_BACKEND_SERVER:808{['front', 'back', 'left', 'right'].index(stream_name)}"
            self.camera_manager.start_camera_stream(stream_name, stream_url)
    
    async def send_system_status(self):
        """Send system status to backend"""
        status = {
            'type': 'system_status',
            'data': {
                'connected': True,
                'latency': 0,
                'commandQueue': 0,
                'videoStreams': self.camera_manager.get_camera_status(),
                'controlMode': 'remote'
            },
            'timestamp': time.time() * 1000
        }
        await self.sio.emit('system_status', status)
    
    async def send_sensor_data(self):
        """Send sensor data to backend"""
        sensor_data = self.sensor_manager.read_sensors()
        message = {
            'type': 'sensor_data',
            'data': sensor_data,
            'timestamp': time.time() * 1000
        }
        await self.sio.emit('sensor_data', message)
    
    async def start(self):
        """Start the Pi controller"""
        logger.info("🚀 Starting Mission Control Pi Controller...")
        
        # Detect cameras
        available_cameras = self.camera_manager.detect_cameras()
        logger.info(f"Available cameras: {available_cameras}")
        
        # Connect to backend
        try:
            await self.sio.connect(self.backend_url)
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            return
        
        self.running = True
        
        # Start sensor data loop
        while self.running:
            await self.send_sensor_data()
            await asyncio.sleep(0.1)  # 10Hz sensor updates
    
    async def stop(self):
        """Stop the Pi controller"""
        logger.info("🛑 Stopping Mission Control Pi Controller...")
        self.running = False
        
        # Stop all camera streams
        for camera_name in self.camera_manager.cameras:
            self.camera_manager.stop_camera_stream(camera_name)
        
        # Disconnect from backend
        await self.sio.disconnect()

async def main():
    """Main function"""
    pi_controller = MissionControlPi()
    
    try:
        await pi_controller.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await pi_controller.stop()

if __name__ == "__main__":
    asyncio.run(main())

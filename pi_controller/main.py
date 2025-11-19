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
            'front': {'camera_id': 0, 'stream': None, 'active': False, 'port': 8082},
            'back': {'camera_id': 1, 'stream': None, 'active': False, 'port': 8081},
            'left': {'device': None, 'stream': None, 'active': False, 'port': 8084},
            'right': {'device': None, 'stream': None, 'active': False, 'port': 8083},
        }
        self.streaming_processes = {}
        self.usb_camera_names = ['left', 'right']
    def detect_cameras(self):
        """Detect available cameras"""
        logger.info("Detecting cameras...")
        available_cameras = []
        
        try:
            # Detect all cameras using v4l2-ctl
            logger.info("Detecting all cameras with v4l2-ctl...")
            result = subprocess.run(['v4l2-ctl', '--list-devices'], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"v4l2-ctl output:\n{result.stdout}")

                # Use a more robust parsing method
                import re
                devices = re.split(r'\n\n', result.stdout.strip())

                pi_camera_indices = [0, 1]  # front, back
                usb_camera_names = ['left', 'right']

                pi_cam_idx = 0
                usb_cam_idx = 0

                for device_info in devices:
                    # Check for CSI (Pi cameras) vs USB
                    is_pi_camera = "platform: rpicam" in device_info or "bcm2835-csi" in device_info
                    is_usb_camera = "usb" in device_info
                    
                    device_path_match = re.search(r'/dev/video\d+', device_info)
                    if device_path_match:
                        device_path = device_path_match.group(0)

                        if is_pi_camera and pi_cam_idx < len(pi_camera_indices):
                            camera_name = ['front', 'back'][pi_cam_idx]
                            self.cameras[camera_name]['device'] = device_path
                            available_cameras.append(camera_name)
                            logger.info(f"✅ Pi camera '{camera_name}' detected at {device_path}")
                            pi_cam_idx += 1

                        elif is_usb_camera and usb_cam_idx < len(usb_camera_names):
                            camera_name = usb_camera_names[usb_cam_idx]
                            self.cameras[camera_name]['device'] = device_path
                            available_cameras.append(camera_name)
                            logger.info(f"✅ USB camera '{camera_name}' detected at {device_path}")
                            usb_cam_idx += 1
            else:
                logger.error("Failed to list devices with v4l2-ctl")
        except Exception as e:
            logger.error(f"Error detecting cameras: {e}")
        
        return available_cameras
    
    def start_camera_stream(self, camera_name: str, stream_url: str = ""):
        """Start streaming for a specific camera using appropriate method for Pi vs USB cameras"""
        if camera_name not in self.cameras:
            logger.error(f"Unknown camera: {camera_name}")
            return False
        
        camera_info = self.cameras[camera_name]
        port = camera_info['port']
        
        # Determine if this is a Raspberry Pi camera or USB camera
        is_pi_camera = camera_name in ['front', 'back']
        
        if is_pi_camera:
            # Use rpicam-vid for Raspberry Pi cameras with HTTP streaming
            camera_id = camera_info['camera_id']
            
            # Create a simple HTTP server that serves MJPEG from rpicam-vid
            cmd = [
                'python3', '-c', f'''
import subprocess
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
class CameraStreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/stream":
            # Start rpicam-vid process
            rpicam_process = subprocess.Popen([
                "rpicam-vid",
                "--camera", "{camera_id}",
                "-t", "0",
                "--width", "640",
                "--height", "480",
                "--framerate", "15",
                "--codec", "mjpeg",
                "--inline",
                "--nopreview",
                "-o", "-"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            try:
                while True:
                    chunk = rpicam_process.stdout.read(4096)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except:
                pass
            finally:
                rpicam_process.terminate()
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass
HTTPServer(("0.0.0.0", {port}), CameraStreamHandler).serve_forever()
'''
            ]
        else:
            # Use OpenCV for USB cameras  
            device = camera_info['device']
            cmd = [
                'python3', '-c', f'''
import cv2
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
class StreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/stream":
            cap = cv2.VideoCapture("{device}", cv2.CAP_V4L2)
            if not cap.isOpened():
                self.send_response(404)
                self.end_headers()
                return
            
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            try:
                while True:
                    ret, frame = cap.read()
                    if ret:
                        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                        frame_bytes = buffer.tobytes()
                        
                        self.wfile.write(b"--frame\\r\\n")
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Content-Length", str(len(frame_bytes)))
                        self.end_headers()
                        self.wfile.write(frame_bytes)
                        self.wfile.write(b"\\r\\n")
                    time.sleep(1/15)
            except:
                pass
            finally:
                cap.release()
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass
HTTPServer(("0.0.0.0", {port}), StreamHandler).serve_forever()
'''
            ]
        
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.streaming_processes[camera_name] = process
            self.cameras[camera_name]['active'] = True
            camera_type = "Pi camera" if is_pi_camera else "USB camera"
            logger.info(f"✅ Started streaming {camera_name} {camera_type} on port {port}")
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
        self.backend_url = "https://001c49625cd6.ngrok-free.app"  # Use ngrok URL for Vercel deployment
        
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
            stream_url = f"udp://localhost:808{['front', 'back', 'left', 'right'].index(stream_name)}"
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
        
        # Start camera streams for available cameras
        for camera_name in available_cameras:
            self.camera_manager.start_camera_stream(camera_name)
            await asyncio.sleep(2)  # Give each camera time to initialize
        
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
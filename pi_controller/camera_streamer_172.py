#!/usr/bin/env python3
"""
Raspberry Pi Camera Streaming for Mission Control
Optimized for IP 172.20.10.4 with multiple camera support
Uses rpicam-vid for Pi cameras and V4L2 for USB cameras
"""

import subprocess
import time
import sys
import signal
import threading
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CameraManager:
    def __init__(self, bind_ip='172.20.10.4'):
        self.bind_ip = bind_ip
        self.processes = {}
        self.running = True
        
        # Camera configuration optimized for the mission control system
        self.cameras = {
            'front': {
                'type': 'pi_camera',
                'camera_id': 0,
                'port': 8085,
                'path': '/front',
                'description': 'Pi Camera (Front)',
                'resolution': '640x480',
                'fps': 15
            },
            'back': {
                'type': 'pi_camera', 
                'camera_id': 1,
                'port': 8086,
                'path': '/back',
                'description': 'Pi Camera (Back)',
                'resolution': '640x480',
                'fps': 15
            },
            'left': {
                'type': 'usb_camera',
                'device': '/dev/video18',
                'port': 8087,
                'path': '/left',
                'description': 'USB Camera (Left)',
                'resolution': '640x480',
                'fps': 15
            },
            'right': {
                'type': 'usb_camera',
                'device': '/dev/video16', 
                'port': 8088,
                'path': '/right',
                'description': 'USB Camera (Right)',
                'resolution': '640x480',
                'fps': 15
            }
        }
        
        # Main HTTP server for camera management
        self.main_server_port = 8080
        
    def detect_cameras(self):
        """Detect available cameras"""
        available_cameras = []
        
        # Check Pi cameras using rpicam
        try:
            result = subprocess.run(['rpicam-hello', '--list-cameras'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "Available cameras" in result.stdout:
                logger.info("Pi cameras detected:")
                lines = result.stdout.split('\n')
                for line in lines:
                    if "0 :" in line:
                        available_cameras.append('front')
                        logger.info("✅ Camera 0 (front) detected")
                    elif "1 :" in line:
                        available_cameras.append('back')
                        logger.info("✅ Camera 1 (back) detected")
        except Exception as e:
            logger.warning(f"rpicam detection failed: {e}")
        
        # Check USB cameras
        for camera_name, config in self.cameras.items():
            if config['type'] == 'usb_camera' and camera_name not in available_cameras:
                device = config['device']
                if os.path.exists(device):
                    available_cameras.append(camera_name)
                    logger.info(f"✅ USB camera {camera_name} detected at {device}")
        
        return available_cameras
    
    def start_pi_camera_stream(self, camera_name, config):
        """Start Pi camera stream using rpicam-vid"""
        camera_id = config['camera_id']
        port = config['port']
        resolution = config['resolution']
        fps = config['fps']
        
        # Using rpicam-vid with HTTP streaming (MJPEG over TCP)
        cmd = [
            'rpicam-vid',
            '--camera', str(camera_id),
            '-t', '0',  # Run indefinitely
            '--width', resolution.split('x')[0],
            '--height', resolution.split('x')[1],
            '--framerate', str(fps),
            '--codec', 'mjpeg',
            '--inline',  # Include SPS/PPS in every frame
            '--nopreview',
            '--listen',  # Listen for connections
            '-o', f'tcp://{self.bind_ip}:{port}?listen=1'
        ]
        
        try:
            logger.info(f"Starting Pi camera {camera_name}: {' '.join(cmd)}")
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
            )
            
            # Give it time to start
            time.sleep(3)
            
            if process.poll() is None:
                self.processes[camera_name] = process
                logger.info(f"✅ Pi camera {camera_name} streaming on tcp://{self.bind_ip}:{port}")
                return True
            else:
                stderr_output = process.stderr.read().decode()
                logger.error(f"❌ Pi camera {camera_name} failed: {stderr_output}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to start Pi camera {camera_name}: {e}")
            return False
    
    def start_usb_camera_stream(self, camera_name, config):
        """Start USB camera stream using FFmpeg"""
        device = config['device']
        port = config['port']
        resolution = config['resolution']
        fps = config['fps']
        
        # Create FFmpeg streaming command
        cmd = [
            'ffmpeg',
            '-f', 'v4l2',
            '-input_format', 'mjpeg',
            '-video_size', resolution,
            '-framerate', str(fps),
            '-i', device,
            '-c:v', 'mjpeg',
            '-f', 'mjpeg',
            '-listen', '1',
            f'http://{self.bind_ip}:{port}/'
        ]
        
        try:
            logger.info(f"Starting USB camera {camera_name}: {' '.join(cmd)}")
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
            )
            
            # Give it time to start
            time.sleep(3)
            
            if process.poll() is None:
                self.processes[camera_name] = process
                logger.info(f"✅ USB camera {camera_name} streaming on http://{self.bind_ip}:{port}/")
                return True
            else:
                stderr_output = process.stderr.read().decode()
                logger.error(f"❌ USB camera {camera_name} failed: {stderr_output}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to start USB camera {camera_name}: {e}")
            return False
    
    def start_camera_stream(self, camera_name):
        """Start streaming for a specific camera"""
        if camera_name not in self.cameras:
            logger.error(f"Unknown camera: {camera_name}")
            return False
        
        config = self.cameras[camera_name]
        
        if config['type'] == 'pi_camera':
            return self.start_pi_camera_stream(camera_name, config)
        elif config['type'] == 'usb_camera':
            return self.start_usb_camera_stream(camera_name, config)
        else:
            logger.error(f"Unknown camera type: {config['type']}")
            return False
    
    def stop_camera_stream(self, camera_name):
        """Stop streaming for a specific camera"""
        if camera_name in self.processes:
            process = self.processes[camera_name]
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
            del self.processes[camera_name]
            logger.info(f"🛑 Stopped camera {camera_name}")
            return True
        return False
    
    def start_main_server(self):
        """Start the main HTTP server that routes camera requests"""
        class CameraRoutingHandler(BaseHTTPRequestHandler):
            def __init__(self, camera_manager, *args, **kwargs):
                self.camera_manager = camera_manager
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                path = self.path.rstrip('/')
                
                # Route to appropriate camera based on path
                camera_name = None
                for name, config in self.camera_manager.cameras.items():
                    if path == config['path'] or path == f"{config['path']}/stream":
                        camera_name = name
                        break
                
                if camera_name:
                    # Proxy request to the camera's individual port
                    config = self.camera_manager.cameras[camera_name]
                    camera_port = config['port']
                    
                    try:
                        import http.client
                        conn = http.client.HTTPConnection(f'{self.camera_manager.bind_ip}:{camera_port}')
                        conn.request('GET', '/')
                        response = conn.getresponse()
                        
                        # Forward response
                        self.send_response(response.status)
                        for header, value in response.getheaders():
                            self.send_header(header, value)
                        self.end_headers()
                        
                        # Stream the data
                        while True:
                            data = response.read(8192)
                            if not data:
                                break
                            self.wfile.write(data)
                            
                        conn.close()
                        
                    except Exception as e:
                        logger.error(f"Error proxying {camera_name}: {e}")
                        self.send_response(503)
                        self.send_header('Content-Type', 'text/plain')
                        self.end_headers()
                        self.wfile.write(f'Camera {camera_name} unavailable: {e}'.encode())
                        
                elif path == '/status':
                    # Return status of all cameras
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    
                    status = {
                        'cameras': {},
                        'bind_ip': self.camera_manager.bind_ip,
                        'timestamp': time.time()
                    }
                    
                    for name, config in self.camera_manager.cameras.items():
                        status['cameras'][name] = {
                            'running': name in self.camera_manager.processes,
                            'port': config['port'],
                            'path': config['path'],
                            'description': config['description']
                        }
                    
                    self.wfile.write(json.dumps(status, indent=2).encode())
                    
                else:
                    # 404 for unknown paths
                    self.send_response(404)
                    self.send_header('Content-Type', 'text/html')
                    self.end_headers()
                    
                    html = f"""
                    <html><body>
                    <h1>Mission Control Camera Server</h1>
                    <p>Available cameras:</p>
                    <ul>
                    """
                    
                    for name, config in self.camera_manager.cameras.items():
                        running = name in self.camera_manager.processes
                        status_text = "🟢 Running" if running else "🔴 Stopped"
                        html += f'<li><a href="{config["path"]}">{config["description"]}</a> - {status_text}</li>'
                    
                    html += """
                    </ul>
                    <p><a href="/status">JSON Status</a></p>
                    </body></html>
                    """
                    
                    self.wfile.write(html.encode())
            
            def log_message(self, format, *args):
                pass  # Suppress default logging
        
        # Create server with camera manager injected
        def handler_factory(*args, **kwargs):
            return CameraRoutingHandler(self, *args, **kwargs)
        
        try:
            server = HTTPServer((self.bind_ip, self.main_server_port), handler_factory)
            logger.info(f"🌐 Camera routing server started on http://{self.bind_ip}:{self.main_server_port}")
            server.serve_forever()
        except Exception as e:
            logger.error(f"Failed to start main server: {e}")
    
    def start_all_cameras(self):
        """Start all available cameras"""
        available_cameras = self.detect_cameras()
        
        started_cameras = []
        for camera_name in available_cameras:
            if self.start_camera_stream(camera_name):
                started_cameras.append(camera_name)
                time.sleep(1)  # Stagger startup
        
        if started_cameras:
            logger.info(f"✅ Started {len(started_cameras)} cameras: {', '.join(started_cameras)}")
        else:
            logger.warning("⚠️ No cameras started")
        
        return started_cameras
    
    def shutdown(self):
        """Shutdown all camera streams"""
        self.running = False
        
        for camera_name in list(self.processes.keys()):
            self.stop_camera_stream(camera_name)
        
        logger.info("🛑 Camera manager shutdown complete")

# Global camera manager instance
camera_manager = None

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    if camera_manager:
        camera_manager.shutdown()
    sys.exit(0)

def main():
    global camera_manager
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("🎥 Starting Mission Control Camera Streamer")
    logger.info("=" * 60)
    
    # Create camera manager
    camera_manager = CameraManager(bind_ip='172.20.10.4')
    
    # Start individual camera streams
    started_cameras = camera_manager.start_all_cameras()
    
    if started_cameras:
        logger.info(f"\n🌐 Camera streams available:")
        for camera_name in started_cameras:
            config = camera_manager.cameras[camera_name]
            logger.info(f"  {config['description']}: http://172.20.10.4:{config['port']}/")
        
        logger.info(f"\n🔗 Main routing server: http://172.20.10.4:{camera_manager.main_server_port}/")
        logger.info("   Individual camera paths:")
        for camera_name, config in camera_manager.cameras.items():
            if camera_name in started_cameras:
                logger.info(f"     {config['path']} -> {config['description']}")
        
        # Start the main routing server (this will block)
        try:
            camera_manager.start_main_server()
        except KeyboardInterrupt:
            logger.info("Received interrupt, shutting down...")
        finally:
            camera_manager.shutdown()
    else:
        logger.error("❌ No cameras could be started")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

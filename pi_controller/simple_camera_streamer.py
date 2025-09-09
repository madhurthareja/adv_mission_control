#!/usr/bin/env python3
"""
Simplified camera streamer for Mission Control system
Designed for IP 172.20.10.4 with optimal performance
"""

import subprocess
import time
import sys
import signal
import threading
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleCameraStreamer:
    def __init__(self):
        self.processes = {}
        self.running = True
        self.bind_ip = '172.20.10.4'
        
        # Base camera config - will be filtered by detection
        self.all_cameras = {
            'front': {'port': 8082, 'camera_id': 0, 'type': 'pi'},
            'back': {'port': 8083, 'camera_id': 1, 'type': 'pi'},
            'left': {'port': 8084, 'device': '/dev/video18', 'type': 'usb'},
            'right': {'port': 8085, 'device': '/dev/video16', 'type': 'usb'}
        }
        
        # Detected cameras will be populated by detect_cameras()
        self.cameras = {}
    
    def detect_cameras(self):
        """Detect available cameras and populate self.cameras"""
        detected_cameras = {}
        
        logger.info("🔍 Detecting available cameras...")
        
        # Check Pi cameras using rpicam-hello
        try:
            result = subprocess.run(['rpicam-hello', '--list-cameras'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "Available cameras" in result.stdout:
                lines = result.stdout.split('\n')
                for line in lines:
                    if "0 :" in line:
                        if 'front' in self.all_cameras:
                            detected_cameras['front'] = self.all_cameras['front']
                            logger.info("✅ Pi Camera 0 detected (front)")
                    elif "1 :" in line:
                        if 'back' in self.all_cameras:
                            detected_cameras['back'] = self.all_cameras['back']
                            logger.info("✅ Pi Camera 1 detected (back)")
            else:
                logger.info("ℹ️  No Pi cameras detected via rpicam-hello")
        except FileNotFoundError:
            logger.info("ℹ️  rpicam-hello not available - skipping Pi camera detection")
        except Exception as e:
            logger.warning(f"⚠️  Pi camera detection failed: {e}")
        
        # Check USB cameras by scanning common video device paths
        usb_cameras_found = []
        for i in range(20):  # Check /dev/video0 through /dev/video19
            device_path = f'/dev/video{i}'
            if os.path.exists(device_path):
                usb_cameras_found.append(device_path)
                logger.info(f"✅ Found USB camera device: {device_path}")
        
        # Map found USB devices to our camera names
        usb_camera_names = ['left', 'right']
        for idx, device_path in enumerate(usb_cameras_found[:2]):  # Take first 2 devices
            if idx < len(usb_camera_names):
                camera_name = usb_camera_names[idx]
                if camera_name in self.all_cameras:
                    # Use the detected device path instead of hardcoded one
                    camera_config = self.all_cameras[camera_name].copy()
                    camera_config['device'] = device_path
                    detected_cameras[camera_name] = camera_config
                    logger.info(f"✅ Mapped {device_path} to {camera_name} camera")
        
        self.cameras = detected_cameras
        
        if detected_cameras:
            logger.info(f"🎯 Total cameras detected: {len(detected_cameras)} ({', '.join(detected_cameras.keys())})")
        else:
            logger.warning("⚠️  No cameras detected - will start with empty configuration")
            # Create a mock camera for testing when no real cameras are available
            detected_cameras['mock'] = {
                'port': 8082,
                'type': 'mock',
                'description': 'Mock camera for testing'
            }
            self.cameras = detected_cameras
            logger.info("📷 Added mock camera for testing purposes")
        
        return list(detected_cameras.keys())
        
    def start_mock_camera(self, name, config):
        """Start a mock camera that serves a test pattern"""
        port = config['port']
        
        # Create a simple HTTP server that serves a basic status page
        server_script = f'''
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import signal

class MockCameraHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ["/", "/stream"]:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            html = """
            <html><body>
            <h1>Mock Camera - {name}</h1>
            <p>🎥 Mock camera is running for testing purposes</p>
            <p>This would normally show a live video stream from camera: {name}</p>
            <p>Server: {self.bind_ip}:{port}</p>
            <script>
                // Auto refresh every 5 seconds to simulate live feed
                setTimeout(() => location.reload(), 5000);
            </script>
            </body></html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def signal_handler(signum, frame):
    exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

try:
    server = HTTPServer(("0.0.0.0", {port}), MockCameraHandler)
    print(f"Mock camera {name} server started on 0.0.0.0:{port}")
    server.serve_forever()
except Exception as e:
    print(f"Error: {{e}}")
'''
        
        cmd = ['python3', '-c', server_script]
        
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(2)
            
            if process.poll() is None:
                self.processes[name] = process
                logger.info(f"✅ {name} mock camera started on {self.bind_ip}:{port}")
                return True
            else:
                stderr_output = process.stderr.read().decode()
                logger.error(f"❌ {name} mock camera failed to start: {stderr_output}")
                return False
        except Exception as e:
            logger.error(f"Error starting {name}: {e}")
            return False

    def start_pi_camera(self, name, config):
        """Start Pi camera with rpicam-vid + HTTP server"""
        port = config['port']
        camera_id = config['camera_id']
        
        # Create a Python HTTP server that uses rpicam-vid
        server_script = f'''
import subprocess
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import signal

class CameraHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ["/", "/stream"]:
            # Start rpicam-vid
            cmd = [
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
            ]
            
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            try:
                while True:
                    data = process.stdout.read(4096)
                    if not data:
                        break
                    self.wfile.write(data)
                    self.wfile.flush()
            except:
                pass
            finally:
                process.terminate()
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def signal_handler(signum, frame):
    exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

try:
    server = HTTPServer(("0.0.0.0", {port}), CameraHandler)
    print(f"Pi camera {name} server started on 0.0.0.0:{port}")
    server.serve_forever()
except Exception as e:
    print(f"Error: {{e}}")
'''
        
        cmd = ['python3', '-c', server_script]
        
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(2)
            
            if process.poll() is None:
                self.processes[name] = process
                logger.info(f"✅ {name} Pi camera started on {self.bind_ip}:{port}")
                return True
            else:
                logger.error(f"❌ {name} Pi camera failed to start")
                return False
        except Exception as e:
            logger.error(f"Error starting {name}: {e}")
            return False
    
    def start_usb_camera(self, name, config):
        """Start USB camera with FFmpeg HTTP server"""
        port = config['port']
        device = config['device']
        
        if not os.path.exists(device):
            logger.warning(f"Device {device} not found for {name}")
            return False
        
        # FFmpeg command for USB camera streaming
        cmd = [
            'ffmpeg',
            '-f', 'v4l2',
            '-input_format', 'mjpeg',
            '-video_size', '640x480',
            '-framerate', '15',
            '-i', device,
            '-c:v', 'copy',
            '-f', 'mjpeg',
            '-listen', '1',
            f'http://0.0.0.0:{port}/'
        ]
        
        try:
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(2)
            
            if process.poll() is None:
                self.processes[name] = process
                logger.info(f"✅ {name} USB camera started on {self.bind_ip}:{port}")
                return True
            else:
                logger.error(f"❌ {name} USB camera failed to start")
                return False
        except Exception as e:
            logger.error(f"Error starting {name}: {e}")
            return False
    
    def start_routing_server(self):
        """Start main routing server on port 8080"""
        class RoutingHandler(BaseHTTPRequestHandler):
            def __init__(self, streamer, *args, **kwargs):
                self.streamer = streamer
                super().__init__(*args, **kwargs)
            
            def do_GET(self):
                path = self.path.rstrip('/')
                
                # Route requests to individual cameras
                camera_routes = {
                    '/front': 8082,
                    '/back': 8083, 
                    '/left': 8084,
                    '/right': 8085
                }
                
                if path in camera_routes:
                    port = camera_routes[path]
                    self.proxy_request(port)
                elif path == '/status':
                    self.send_status()
                else:
                    self.send_404()
            
            def proxy_request(self, port):
                try:
                    import http.client
                    conn = http.client.HTTPConnection(f'{self.streamer.bind_ip}:{port}')
                    conn.request('GET', '/stream')
                    response = conn.getresponse()
                    
                    self.send_response(response.status)
                    for header, value in response.getheaders():
                        self.send_header(header, value)
                    self.end_headers()
                    
                    while True:
                        data = response.read(8192)
                        if not data:
                            break
                        self.wfile.write(data)
                    
                    conn.close()
                except Exception as e:
                    self.send_response(503)
                    self.send_header('Content-Type', 'text/plain')
                    self.end_headers()
                    self.wfile.write(f'Camera unavailable: {e}'.encode())
            
            def send_status(self):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                import json
                status = {
                    'cameras': {},
                    'server_ip': self.streamer.bind_ip,
                    'timestamp': time.time()
                }
                
                for name, config in self.streamer.cameras.items():
                    status['cameras'][name] = {
                        'running': name in self.streamer.processes,
                        'port': config['port'],
                        'type': config['type']
                    }
                
                self.wfile.write(json.dumps(status, indent=2).encode())
            
            def send_404(self):
                self.send_response(404)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                html = '''
                <html><body>
                <h1>Mission Control Cameras</h1>
                <ul>
                <li><a href="/front">Front Camera</a></li>
                <li><a href="/back">Back Camera</a></li>
                <li><a href="/left">Left Camera</a></li>
                <li><a href="/right">Right Camera</a></li>
                <li><a href="/status">Status (JSON)</a></li>
                </ul>
                </body></html>
                '''
                self.wfile.write(html.encode())
            
            def log_message(self, format, *args):
                pass
        
        def handler_factory(*args, **kwargs):
            return RoutingHandler(self, *args, **kwargs)
        
        try:
            server = HTTPServer(("0.0.0.0", 8080), handler_factory)
            logger.info(f"🌐 Routing server started on 0.0.0.0:8080 (accessible via {self.bind_ip}:8080)")
            server.serve_forever()
        except Exception as e:
            logger.error(f"Routing server error: {e}")
    
    def start_all(self):
        """Start all cameras and routing server"""
        
        # First, detect available cameras
        detected_camera_names = self.detect_cameras()
        
        if not detected_camera_names:
            logger.error("❌ No cameras detected")
            return
        
        started = []
        
        # Start individual camera servers
        for name, config in self.cameras.items():
            success = False
            if config['type'] == 'pi':
                success = self.start_pi_camera(name, config)
            elif config['type'] == 'usb':
                success = self.start_usb_camera(name, config)
            elif config['type'] == 'mock':
                success = self.start_mock_camera(name, config)
            
            if success:
                started.append(name)
            time.sleep(1)
        
        if started:
            logger.info(f"Started cameras: {', '.join(started)}")
            logger.info("Camera URLs:")
            for name in started:
                port = self.cameras[name]['port']
                logger.info(f"  {name}: http://{self.bind_ip}:{port}/")
            
            logger.info(f"Main server: http://{self.bind_ip}:8080/")
            
            # Start routing server (blocks)
            self.start_routing_server()
        else:
            logger.error("No cameras started")
    
    def shutdown(self):
        """Stop all processes"""
        self.running = False
        for name, process in self.processes.items():
            process.terminate()
            logger.info(f"Stopped {name}")

# Global instance
streamer = None

def signal_handler(signum, frame):
    if streamer:
        streamer.shutdown()
    sys.exit(0)

def main():
    global streamer
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("🎥 Starting Simple Camera Streamer for 172.20.10.4")
    
    streamer = SimpleCameraStreamer()
    
    try:
        streamer.start_all()
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
    finally:
        if streamer:
            streamer.shutdown()

if __name__ == "__main__":
    main()

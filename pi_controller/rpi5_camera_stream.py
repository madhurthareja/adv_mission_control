#!/usr/bin/env python3
"""
Raspberry Pi 5 Camera Streaming Script
Based on working rpicam-vid solution for RPi 5
"""

import subprocess
import logging
import time
import threading
import signal
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RPi5CameraStreamer:
    def __init__(self):
        self.processes = {}
        self.running = True
        
        # Camera configuration for RPi 5 - Updated based on actual device detection
        self.cameras = {
            'front': {
                'camera_id': 0,
                'v4l2_device': '/dev/video11',  # rp1-cfe platform:1f00110000.csi
                'port': 8082,
                'description': 'Pi Camera v3 (front)'
            },
            'back': {
                'camera_id': 1, 
                'v4l2_device': '/dev/video4',   # rp1-cfe platform:1f00128000.csi
                'port': 8081,
                'description': 'Pi Camera v2 (back)'
            },
            'left': {
                'v4l2_device': '/dev/video18',  # USB C270 camera
                'port': 8084,
                'description': 'USB C270 (left)'
            },
            'right': {
                'v4l2_device': '/dev/video16',  # USB C270 camera  
                'port': 8083,
                'description': 'USB C270 (right)'
            }
        }
    
    def detect_cameras(self):
        """Detect available cameras using V4L2 and rpicam"""
        logger.info("Detecting cameras...")
        available_cameras = []
        
        # First try rpicam for Pi cameras (preferred method for RPi 5)
        try:
            result = subprocess.run(['rpicam-hello', '--list-cameras'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and "Available cameras" in result.stdout:
                logger.info("Pi cameras detected via rpicam:")
                logger.info(result.stdout)
                
                # Parse output to see which cameras are available
                lines = result.stdout.split('\n')
                for line in lines:
                    if "0 :" in line:
                        available_cameras.append('front')
                        logger.info("✅ Camera 0 (front) available via rpicam")
                    elif "1 :" in line:
                        available_cameras.append('back')
                        logger.info("✅ Camera 1 (back) available via rpicam")
            else:
                logger.warning("No Pi cameras detected via rpicam, trying V4L2...")
                
        except Exception as e:
            logger.warning(f"rpicam detection failed: {e}, trying V4L2...")
        
        # Test all cameras using V4L2 (fallback for Pi cameras, primary for USB)
        for camera_name, config in self.cameras.items():
            if camera_name not in available_cameras:  # Only test if not already detected via rpicam
                device = config['v4l2_device']
                try:
                    # Test if device can be opened
                    import cv2
                    cap = cv2.VideoCapture(device, cv2.CAP_V4L2)
                    if cap.isOpened():
                        available_cameras.append(camera_name)
                        logger.info(f"✅ {camera_name} ({config['description']}) detected at {device}")
                    else:
                        logger.warning(f"❌ {camera_name} not accessible at {device}")
                    cap.release()
                except Exception as e:
                    logger.error(f"Error testing {camera_name}: {e}")
        
        return available_cameras
    
    def start_camera_stream(self, camera_name):
        """Start streaming for a camera using the best available method"""
        if camera_name not in self.cameras:
            logger.error(f"Unknown camera: {camera_name}")
            return False
        
        camera_config = self.cameras[camera_name]
        port = camera_config['port']
        
        # Determine if this is a Pi camera or USB camera
        is_pi_camera = camera_name in ['front', 'back']
        
        if is_pi_camera:
            # Try rpicam-vid first (your working solution approach)
            if self.try_rpicam_stream(camera_name):
                return True
            else:
                # Fallback to V4L2/FFmpeg approach
                logger.info(f"rpicam failed for {camera_name}, trying V4L2 approach...")
                return self.try_v4l2_stream(camera_name)
        else:
            # USB cameras use V4L2/OpenCV
            return self.try_v4l2_stream(camera_name)
    
    def try_rpicam_stream(self, camera_name):
        """Try streaming using rpicam-vid (RPi 5 native method)"""
        camera_config = self.cameras[camera_name]
        camera_id = camera_config['camera_id']
        port = camera_config['port']
        
        # Use rpicam-vid with TCP streaming (based on your working solution)
        cmd = [
            'rpicam-vid',
            '--camera', str(camera_id),
            '-t', '0',                          # Run indefinitely
            '--width', '640',
            '--height', '480', 
            '--framerate', '15',
            '--codec', 'mjpeg',                 # MJPEG for HTTP compatibility
            '--inline',                         # Inline headers
            '--nopreview',                      # No preview window
            '--listen',                         # Listen for connections
            '-o', f'tcp://0.0.0.0:{port}?listen=1'  # TCP output with listen
        ]
        
        try:
            logger.info(f"Trying rpicam-vid for {camera_name}...")
            logger.info(f"Command: {' '.join(cmd)}")
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
            )
            
            # Give it a moment to start
            time.sleep(3)
            
            # Check if process is still running
            if process.poll() is None:
                self.processes[camera_name] = process
                logger.info(f"✅ rpicam-vid started for {camera_name} on tcp://0.0.0.0:{port}")
                return True
            else:
                stderr_output = process.stderr.read().decode()
                logger.warning(f"❌ rpicam-vid failed for {camera_name}: {stderr_output}")
                return False
                
        except Exception as e:
            logger.warning(f"rpicam-vid failed for {camera_name}: {e}")
            return False
    
    def try_v4l2_stream(self, camera_name):
        """Try streaming using V4L2/OpenCV (fallback method)"""
        camera_config = self.cameras[camera_name]
        device = camera_config['v4l2_device']
        port = camera_config['port']
        
        # Create a simple HTTP MJPEG server using OpenCV
        cmd = [
            'python3', '-c', f'''
import cv2
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import signal

class StreamHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/stream":
            cap = cv2.VideoCapture("{device}", cv2.CAP_V4L2)
            if not cap.isOpened():
                self.send_response(404)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(b"Camera not available")
                return
            
            # Set camera properties
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 15)
            
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
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
                    else:
                        break
                    time.sleep(1/15)
            except Exception as e:
                print(f"Streaming error: {{e}}")
            finally:
                cap.release()
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def signal_handler(signum, frame):
    print("Shutting down camera server...")
    exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

try:
    server = HTTPServer(("0.0.0.0", {port}), StreamHandler)
    print(f"Camera server started on port {port}")
    server.serve_forever()
except Exception as e:
    print(f"Server error: {{e}}")
'''
        ]
        
        try:
            logger.info(f"Starting V4L2 stream for {camera_name} at {device}...")
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=lambda: signal.signal(signal.SIGINT, signal.SIG_IGN)
            )
            
            # Give it a moment to start
            time.sleep(3)
            
            # Check if process is still running
            if process.poll() is None:
                self.processes[camera_name] = process
                logger.info(f"✅ V4L2 stream started for {camera_name} on http://0.0.0.0:{port}/stream")
                return True
            else:
                stderr_output = process.stderr.read().decode()
                logger.error(f"❌ V4L2 stream failed for {camera_name}: {stderr_output}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to start V4L2 stream for {camera_name}: {e}")
            return False
    
    def stop_camera_stream(self, camera_name):
        """Stop streaming for a specific camera"""
        if camera_name in self.processes:
            process = self.processes[camera_name]
            try:
                process.terminate()
                process.wait(timeout=5)
                logger.info(f"🛑 Stopped {camera_name} camera stream")
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                logger.info(f"🛑 Force killed {camera_name} camera stream")
            finally:
                del self.processes[camera_name]
    
    def stop_all_streams(self):
        """Stop all camera streams"""
        logger.info("Stopping all camera streams...")
        for camera_name in list(self.processes.keys()):
            self.stop_camera_stream(camera_name)
        self.running = False
    
    def start_all_available_cameras(self):
        """Detect and start all available cameras"""
        available_cameras = self.detect_cameras()
        
        if not available_cameras:
            logger.error("No cameras detected!")
            return False
        
        success_count = 0
        for camera_name in available_cameras:
            if self.start_camera_stream(camera_name):
                success_count += 1
        
        logger.info(f"Successfully started {success_count}/{len(available_cameras)} cameras")
        return success_count > 0
    
    def monitor_streams(self):
        """Monitor running streams and restart if needed"""
        while self.running:
            for camera_name, process in list(self.processes.items()):
                if process.poll() is not None:
                    logger.warning(f"Camera {camera_name} stream died, restarting...")
                    self.stop_camera_stream(camera_name)
                    time.sleep(2)
                    self.start_camera_stream(camera_name)
            
            time.sleep(5)  # Check every 5 seconds

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received shutdown signal")
    if 'streamer' in globals():
        streamer.stop_all_streams()
    sys.exit(0)

def main():
    """Main function"""
    global streamer
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("🚀 Starting RPi 5 Camera Streamer...")
    
    streamer = RPi5CameraStreamer()
    
    # Start all available cameras
    if not streamer.start_all_available_cameras():
        logger.error("Failed to start any cameras!")
        return 1
    
    logger.info("✅ Camera streaming started successfully!")
    logger.info("Camera streams available at:")
    for camera_name, config in streamer.cameras.items():
        if camera_name in streamer.processes:
            port = config['port']
            logger.info(f"  {config['description']}: tcp://192.168.1.110:{port}")
    
    logger.info("Press Ctrl+C to stop...")
    
    try:
        # Start monitoring in a separate thread
        monitor_thread = threading.Thread(target=streamer.monitor_streams)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Keep main thread alive
        while streamer.running:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    finally:
        streamer.stop_all_streams()
        logger.info("👋 Camera streamer stopped")

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code or 0)

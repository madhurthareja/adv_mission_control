#!/usr/bin/env python3
"""
Simple camera test script without WebSocket - just start the cameras
"""

import asyncio
import json
import logging
import time
import subprocess
import threading
from typing import Dict, List, Optional
import cv2
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CameraManager:
    def __init__(self):
        self.cameras = {
            'front': {'camera_id': 0, 'stream': None, 'active': False, 'port': 8082},  # raspi v3
            'back': {'camera_id': 1, 'stream': None, 'active': False, 'port': 8081},   # raspi v2
            'left': {'device': '/dev/video7', 'stream': None, 'active': False, 'port': 8084},    # usb C270
            'right': {'device': '/dev/video18', 'stream': None, 'active': False, 'port': 8083},   # usb C270
        }
        self.streaming_processes = {}
    
    def detect_cameras(self):
        """Detect available cameras"""
        logger.info("Detecting cameras...")
        available_cameras = []
        
        try:
            # Detect Pi cameras using rpicam tools
            logger.info("Checking for Pi cameras...")
            result = subprocess.run(['rpicam-hello', '--list-cameras'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and "Available cameras" in result.stdout:
                logger.info(f"Pi cameras detected: {result.stdout}")
                if "0 :" in result.stdout:
                    available_cameras.append('front')
                    logger.info("✅ Front Pi camera (camera 0) detected")
                if "1 :" in result.stdout:
                    available_cameras.append('back')
                    logger.info("✅ Back Pi camera (camera 1) detected")
            
            # Detect USB cameras using V4L2
            logger.info("Checking for USB cameras...")
            for camera_name in ['left', 'right']:
                if 'device' in self.cameras[camera_name]:
                    device = self.cameras[camera_name]['device']
                    try:
                        cap = cv2.VideoCapture(device)
                        if cap.isOpened():
                            available_cameras.append(camera_name)
                            logger.info(f"✅ {camera_name} USB camera detected at {device}")
                        else:
                            logger.warning(f"❌ {camera_name} USB camera not found at {device}")
                        cap.release()
                    except Exception as e:
                        logger.error(f"Error testing {camera_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error detecting cameras: {e}")
        
        return available_cameras
    
    def start_camera_stream(self, camera_name: str):
        """Start streaming for a specific camera"""
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

print(f"Starting Pi camera {camera_id} server on port {port}")
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

print(f"Starting USB camera server on port {port}")
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

def main():
    logger.info("🚀 Starting Camera Test...")
    
    camera_manager = CameraManager()
    
    # Detect cameras
    available_cameras = camera_manager.detect_cameras()
    logger.info(f"Available cameras: {available_cameras}")
    
    # Start camera streams for available cameras
    for camera_name in available_cameras:
        logger.info(f"Starting {camera_name} camera...")
        camera_manager.start_camera_stream(camera_name)
        time.sleep(2)  # Give each camera time to initialize
    
    logger.info("✅ All cameras started! Press Ctrl+C to stop...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("🛑 Stopping cameras...")
        for camera_name in camera_manager.streaming_processes:
            process = camera_manager.streaming_processes[camera_name]
            process.terminate()
            process.wait()
        logger.info("✅ All cameras stopped!")

if __name__ == "__main__":
    main()

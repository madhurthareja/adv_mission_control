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
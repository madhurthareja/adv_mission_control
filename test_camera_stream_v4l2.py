#!/usr/bin/env python3
"""
Simple HTTP Camera Streaming Server - V4L2 Direct Access
Test script to stream USB cameras to HTTP endpoints using V4L2 directly
"""

import cv2
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import numpy as np

class CameraStreamer:
    def __init__(self, camera_device, port):
        self.camera_device = camera_device
        self.port = port
        self.cap = None
        self.running = False
        self.current_frame = None
        
    def start_capture(self):
        """Start capturing frames from camera using V4L2"""
        try:
            # Use V4L2 backend directly
            self.cap = cv2.VideoCapture(self.camera_device, cv2.CAP_V4L2)
            if not self.cap.isOpened():
                print(f"❌ Failed to open camera {self.camera_device}")
                return False
            
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 15)
            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
            
            self.running = True
            print(f"✅ Started capturing from {self.camera_device}")
            
            frame_count = 0
            while self.running:
                ret, frame = self.cap.read()
                if ret:
                    # Resize if needed
                    if frame.shape[1] != 640 or frame.shape[0] != 480:
                        frame = cv2.resize(frame, (640, 480))
                    
                    # Encode frame as JPEG
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    self.current_frame = buffer.tobytes()
                    frame_count += 1
                    
                    if frame_count % 30 == 0:  # Log every 30 frames
                        print(f"📷 {self.camera_device}: {frame_count} frames captured")
                else:
                    print(f"⚠️ No frame from {self.camera_device}")
                    time.sleep(0.1)
                    
                time.sleep(1/15)  # 15 FPS
                
        except Exception as e:
            print(f"❌ Error capturing from {self.camera_device}: {e}")
        finally:
            if self.cap:
                self.cap.release()
    
    def get_frame(self):
        """Get current frame as JPEG bytes"""
        return self.current_frame
    
    def stop(self):
        """Stop capturing"""
        self.running = False

class StreamHandler(BaseHTTPRequestHandler):
    camera_streamers = {}
    
    def do_GET(self):
        if self.path == '/stream':
            # Find the camera streamer for this server
            camera_streamer = None
            for streamer in StreamHandler.camera_streamers.values():
                if streamer.port == self.server.server_port:
                    camera_streamer = streamer
                    break
            
            if not camera_streamer:
                self.send_response(404)
                self.end_headers()
                return
            
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            
            try:
                while True:
                    frame = camera_streamer.get_frame()
                    if frame:
                        self.wfile.write(b'--frame\r\n')
                        self.send_header('Content-Type', 'image/jpeg')
                        self.send_header('Content-Length', str(len(frame)))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b'\r\n')
                    time.sleep(1/15)  # 15 FPS
            except Exception as e:
                print(f"🔌 Stream ended: {e}")
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress HTTP log messages
        pass

def start_camera_server(camera_device, port):
    """Start HTTP server for camera stream"""
    try:
        camera_streamer = CameraStreamer(camera_device, port)
        StreamHandler.camera_streamers[camera_device] = camera_streamer
        
        # Start camera capture in separate thread
        capture_thread = threading.Thread(target=camera_streamer.start_capture)
        capture_thread.daemon = True
        capture_thread.start()
        
        # Wait a bit for camera to initialize
        time.sleep(3)
        
        # Create HTTP server
        httpd = HTTPServer(('0.0.0.0', port), StreamHandler)
        
        print(f"🎥 Camera {camera_device} streaming on http://localhost:{port}/stream")
        httpd.serve_forever()
        
    except Exception as e:
        print(f"❌ Failed to start server on port {port}: {e}")

def test_camera_basic(camera_device):
    """Basic test of camera device"""
    print(f"🔍 Testing {camera_device}...")
    
    # Try V4L2 backend
    cap = cv2.VideoCapture(camera_device, cv2.CAP_V4L2)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret and frame is not None:
            h, w = frame.shape[:2]
            print(f"✅ {camera_device}: {w}x{h} - V4L2 backend working")
            cap.release()
            return True
        else:
            print(f"⚠️ {camera_device}: Opened but no frame - V4L2 backend")
    else:
        print(f"❌ {camera_device}: Failed to open - V4L2 backend")
    
    cap.release()
    
    # Try default backend as fallback
    cap = cv2.VideoCapture(camera_device)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret and frame is not None:
            h, w = frame.shape[:2]
            print(f"✅ {camera_device}: {w}x{h} - Default backend working")
            cap.release()
            return True
        else:
            print(f"⚠️ {camera_device}: Opened but no frame - Default backend")
    else:
        print(f"❌ {camera_device}: Failed to open - Default backend")
    
    cap.release()
    return False

def main():
    """Test USB camera streaming with V4L2"""
    print("🚀 Starting USB Camera Stream Test (V4L2)...")
    
    # Test camera devices (based on your previous output)
    cameras = [
        ('/dev/video16', 8080),  # Back camera
        ('/dev/video18', 8081),  # Left camera
    ]
    
    working_cameras = []
    
    # Test each camera first
    for camera_device, port in cameras:
        if test_camera_basic(camera_device):
            working_cameras.append((camera_device, port))
    
    if not working_cameras:
        print("❌ No working cameras found!")
        return
    
    print(f"\n🎯 Starting streaming servers for {len(working_cameras)} cameras...")
    
    threads = []
    for camera_device, port in working_cameras:
        # Start streaming server in separate thread
        thread = threading.Thread(target=start_camera_server, args=(camera_device, port))
        thread.daemon = True
        thread.start()
        threads.append(thread)
        time.sleep(1)  # Stagger startup
    
    if threads:
        print(f"\n📺 Camera streams available:")
        for camera_device, port in working_cameras:
            print(f"   {camera_device}: http://localhost:{port}/stream")
        
        print("\n📱 You can now open your browser or dashboard to view the streams")
        print("Press Ctrl+C to stop...")
        
        try:
            # Keep main thread alive
            while True:
                time.sleep(5)
                # Show status
                active_streams = sum(1 for _, streamer in StreamHandler.camera_streamers.items() if streamer.current_frame is not None)
                print(f"📊 {active_streams}/{len(working_cameras)} cameras streaming...")
        except KeyboardInterrupt:
            print("\n🛑 Stopping camera streams...")
    else:
        print("❌ Failed to start any camera streams!")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Simple HTTP Camera Streaming Server
Test script to stream USB cameras to HTTP endpoints
"""

import cv2
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import socket

class CameraStreamer:
    def __init__(self, camera_device, port):
        self.camera_device = camera_device
        self.port = port
        self.cap = None
        self.running = False
        self.current_frame = None
        
    def start_capture(self):
        """Start capturing frames from camera"""
        try:
            self.cap = cv2.VideoCapture(self.camera_device)
            if not self.cap.isOpened():
                print(f"❌ Failed to open camera {self.camera_device}")
                return False
            
            # Set camera properties
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_FPS, 15)
            
            self.running = True
            print(f"✅ Started capturing from {self.camera_device}")
            
            while self.running:
                ret, frame = self.cap.read()
                if ret:
                    # Encode frame as JPEG
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    self.current_frame = buffer.tobytes()
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
    def __init__(self, camera_streamer, *args, **kwargs):
        self.camera_streamer = camera_streamer
        super().__init__(*args, **kwargs)
        
    def do_GET(self):
        if self.path == '/stream':
            self.send_response(200)
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                while True:
                    frame = self.camera_streamer.get_frame()
                    if frame:
                        self.wfile.write(b'--frame\r\n')
                        self.send_header('Content-Type', 'image/jpeg')
                        self.send_header('Content-Length', str(len(frame)))
                        self.end_headers()
                        self.wfile.write(frame)
                        self.wfile.write(b'\r\n')
                    time.sleep(1/15)  # 15 FPS
            except Exception as e:
                print(f"Stream ended: {e}")
        else:
            self.send_response(404)
            self.end_headers()

def start_camera_server(camera_device, port):
    """Start HTTP server for camera stream"""
    try:
        camera_streamer = CameraStreamer(camera_device, port)
        
        # Start camera capture in separate thread
        capture_thread = threading.Thread(target=camera_streamer.start_capture)
        capture_thread.daemon = True
        capture_thread.start()
        
        # Wait a bit for camera to initialize
        time.sleep(2)
        
        # Create HTTP server
        handler = lambda *args, **kwargs: StreamHandler(camera_streamer, *args, **kwargs)
        httpd = HTTPServer(('0.0.0.0', port), handler)
        
        print(f"🎥 Camera {camera_device} streaming on http://localhost:{port}/stream")
        httpd.serve_forever()
        
    except Exception as e:
        print(f"❌ Failed to start server on port {port}: {e}")

def main():
    """Test USB camera streaming"""
    print("🚀 Starting USB Camera Stream Test...")
    
    # Test camera devices (based on your previous output)
    cameras = [
        ('/dev/video16', 8080),  # Back camera
        ('/dev/video18', 8081),  # Left camera
    ]
    
    threads = []
    
    for camera_device, port in cameras:
        print(f"Testing camera {camera_device}...")
        
        # Test if camera works with OpenCV
        cap = cv2.VideoCapture(camera_device)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"✅ {camera_device} is working")
                # Start streaming server in separate thread
                thread = threading.Thread(target=start_camera_server, args=(camera_device, port))
                thread.daemon = True
                thread.start()
                threads.append(thread)
            else:
                print(f"⚠️ {camera_device} opened but no frame received")
            cap.release()
        else:
            print(f"❌ {camera_device} failed to open")
    
    if threads:
        print(f"\n🎯 Streaming {len(threads)} cameras:")
        for i, (camera_device, port) in enumerate(cameras[:len(threads)]):
            print(f"   Camera {i+1}: http://localhost:{port}/stream")
        
        print("\n📱 You can now open your browser and check these URLs")
        print("Press Ctrl+C to stop...")
        
        try:
            # Keep main thread alive
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping camera streams...")
    else:
        print("❌ No working cameras found!")

if __name__ == "__main__":
    main()

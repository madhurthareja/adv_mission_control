#!/usr/bin/env python3
"""
GStreamer-based Raspberry Pi Camera Streamer
This should work better with Pi 5 cameras
"""

import subprocess
import time
import sys
import signal
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import socket

# Camera configuration
cameras = {
    'front': {'device': '/dev/video12', 'port': 8085, 'name': 'Pi Camera v3 (IMX708)', 'media_dev': '/dev/media1'},
    'back': {'device': '/dev/video4', 'port': 8086, 'name': 'Pi Camera v2 (IMX219)', 'media_dev': '/dev/media2'},
}

processes = {}

class GStreamerCameraHandler(BaseHTTPRequestHandler):
    def __init__(self, device, camera_name, *args, **kwargs):
        self.device = device
        self.camera_name = camera_name
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == "/stream":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            
            # GStreamer pipeline for V4L2 source
            gst_pipeline = [
                'gst-launch-1.0',
                f'v4l2src', f'device={self.device}',
                '!', 'video/x-raw,width=640,height=480,framerate=15/1',
                '!', 'videoconvert',
                '!', 'jpegenc', 'quality=85',
                '!', 'fdsink', 'fd=1'
            ]
            
            print(f"🚀 Starting GStreamer for {self.camera_name}: {' '.join(gst_pipeline)}")
            
            try:
                process = subprocess.Popen(
                    gst_pipeline,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    bufsize=0
                )
                
                frame_count = 0
                while True:
                    # Read JPEG data from GStreamer
                    chunk = process.stdout.read(8192)
                    if not chunk:
                        stderr_output = process.stderr.read()
                        if stderr_output:
                            print(f"❌ GStreamer error for {self.camera_name}: {stderr_output.decode()}")
                        break
                    
                    # For MJPEG streaming, we need to find frame boundaries
                    # This is a simplified approach
                    self.wfile.write(b"--frame\r\n")
                    self.send_header("Content-Type", "image/jpeg")
                    self.send_header("Content-Length", str(len(chunk)))
                    self.end_headers()
                    self.wfile.write(chunk)
                    self.wfile.write(b"\r\n")
                    
                    frame_count += 1
                    if frame_count % 50 == 0:
                        print(f"📹 {self.camera_name}: {frame_count} chunks streamed")
                    
            except Exception as e:
                print(f"❌ Error streaming {self.camera_name}: {e}")
            finally:
                if 'process' in locals() and process:
                    process.terminate()
                    process.wait()
                print(f"🛑 {self.camera_name} streaming stopped")
        
        elif self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            html = f"""
            <html>
            <body>
                <h1>{self.camera_name} Stream</h1>
                <img src="/stream" style="width:640px; height:480px; border:1px solid #ccc;">
                <p>Device: {self.device}</p>
                <p><a href="/stream">Direct stream link</a></p>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass

def setup_media_pipeline(media_dev, sensor_name):
    """Setup media controller pipeline"""
    try:
        cmd = [
            'media-ctl', '-d', media_dev, '--set-v4l2',
            f'"{sensor_name}":0[fmt:SRGGB10_1X10/1640x1232]'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Media pipeline setup for {sensor_name}")
            return True
        else:
            print(f"❌ Media pipeline setup failed for {sensor_name}: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error setting up media pipeline: {e}")
        return False

def test_gstreamer():
    """Test if GStreamer is available"""
    try:
        result = subprocess.run(['gst-launch-1.0', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ GStreamer is available")
            return True
        else:
            print("❌ GStreamer not working properly")
            return False
    except:
        print("❌ GStreamer not found")
        return False

def start_camera_server(camera_name, device, port, camera_desc):
    """Start HTTP server for a camera"""
    try:
        handler_class = lambda *args, **kwargs: GStreamerCameraHandler(device, camera_desc, *args, **kwargs)
        server = HTTPServer(("0.0.0.0", port), handler_class)
        print(f"🚀 {camera_name} ({camera_desc}) streaming on port {port}")
        server.serve_forever()
    except Exception as e:
        print(f"❌ Error starting {camera_name} server: {e}")
        return False

def start_camera_process(camera_name, info):
    """Start camera streaming in a separate process"""
    device = info['device']
    port = info['port']
    camera_desc = info['name']
    
    def run_server():
        start_camera_server(camera_name, device, port, camera_desc)
    
    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()
    
    # Wait and check if port is listening
    time.sleep(3)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        
        if result == 0:
            print(f"✅ {camera_name} server is listening on port {port}")
            return True
        else:
            print(f"❌ {camera_name} server not responding on port {port}")
            return False
    except Exception as e:
        print(f"❌ Error checking {camera_name} server: {e}")
        return False

def signal_handler(sig, frame):
    print("\n🛑 Stopping all streams...")
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🎥 Starting GStreamer-based Pi Camera Streamer")
    print("=" * 50)
    
    # Check GStreamer
    if not test_gstreamer():
        print("❌ GStreamer is required but not available")
        sys.exit(1)
    
    # Setup media pipelines
    setup_media_pipeline('/dev/media1', 'imx708')
    setup_media_pipeline('/dev/media2', 'imx219 4-0010')
    
    started_cameras = []
    
    for camera_name, info in cameras.items():
        print(f"\n📹 Setting up {camera_name}...")
        if start_camera_process(camera_name, info):
            started_cameras.append(camera_name)
        time.sleep(1)
    
    if started_cameras:
        print(f"\n✅ Started {len(started_cameras)} camera(s): {', '.join(started_cameras)}")
        print("\n🌐 Camera streams available at:")
        for camera_name in started_cameras:
            port = cameras[camera_name]['port']
            print(f"  📹 {camera_name}: http://192.168.1.110:{port}/stream")
            print(f"      Test page: http://192.168.1.110:{port}/")
        
        print("\n📝 Press Ctrl+C to stop all streams")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    else:
        print("❌ No cameras started successfully")

if __name__ == "__main__":
    main()

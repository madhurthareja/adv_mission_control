#!/usr/bin/env python3
"""
MPU6050 API Server
Provides HTTP API endpoint for MPU6050 sensor data
"""

from flask import Flask, jsonify
from flask_cors import CORS
import time
import threading
import sys
import os

# Add the mpu directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'mpu'))

try:
    from mpu.mpu6050_reader import MPU6050Reader
except ImportError:
    print("Failed to import MPU6050Reader. Using mock data.")
    MPU6050Reader = None

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

class MPUDataServer:
    def __init__(self):
        self.latest_data = None
        self.mpu_reader = None
        self.data_lock = threading.Lock()
        self.running = False
        
        # Try to initialize MPU6050
        self.init_mpu()
        
        # Start data collection thread
        self.start_data_collection()
    
    def init_mpu(self):
        """Initialize MPU6050 sensor"""
        if MPU6050Reader is None:
            print("⚠️  MPU6050Reader not available, using mock data")
            return
            
        try:
            self.mpu_reader = MPU6050Reader(bus=1)  # Standard I2C bus
            print("✅ MPU6050 initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize MPU6050: {e}")
            print("   Will use mock data instead")
            self.mpu_reader = None
    
    def read_mpu_data(self):
        """Read data from MPU6050 or generate mock data"""
        if self.mpu_reader:
            try:
                return self.mpu_reader.read_sensor_data()
            except Exception as e:
                print(f"Error reading MPU data: {e}")
                return None
        
        # Generate mock data for testing
        import math
        import random
        
        return {
            'ax': random.uniform(-1, 1),
            'ay': random.uniform(-1, 1), 
            'az': 9.8 + random.uniform(-0.5, 0.5),
            'gx': random.uniform(-10, 10),
            'gy': random.uniform(-10, 10),
            'gz': random.uniform(-10, 10),
            'temp': 25.0 + random.uniform(-2, 5),
            'roll': random.uniform(-30, 30),
            'pitch': random.uniform(-30, 30),
            'jerk': random.choice([0, 0, 0, 1]),  # Mostly stable
            'accel_mag': 9.8 + random.uniform(-0.5, 0.5)
        }
    
    def data_collection_loop(self):
        """Continuous data collection loop"""
        while self.running:
            try:
                data = self.read_mpu_data()
                if data:
                    with self.data_lock:
                        self.latest_data = {
                            **data,
                            'timestamp': time.time(),
                            'data_source': 'real' if self.mpu_reader else 'mock'
                        }
                
                time.sleep(0.1)  # 10Hz update rate
                
            except Exception as e:
                print(f"Error in data collection: {e}")
                time.sleep(1)
    
    def start_data_collection(self):
        """Start the data collection thread"""
        self.running = True
        self.data_thread = threading.Thread(target=self.data_collection_loop, daemon=True)
        self.data_thread.start()
        print("📡 MPU data collection started")
    
    def stop_data_collection(self):
        """Stop the data collection thread"""
        self.running = False
        if hasattr(self, 'data_thread'):
            self.data_thread.join()
        print("📡 MPU data collection stopped")
    
    def get_latest_data(self):
        """Get the latest sensor data"""
        with self.data_lock:
            return self.latest_data.copy() if self.latest_data else None

# Global MPU data server instance
mpu_server = MPUDataServer()

@app.route('/api/data', methods=['GET'])
def get_sensor_data():
    """API endpoint to get latest sensor data"""
    try:
        data = mpu_server.get_latest_data()
        
        if data is None:
            return jsonify({
                'error': 'No sensor data available',
                'timestamp': time.time()
            }), 503
        
        # Format data for consumption by the main server
        response = {
            'success': True,
            'data': {
                'acceleration': {
                    'x': data['ax'],
                    'y': data['ay'],
                    'z': data['az']
                },
                'gyroscope': {
                    'x': data['gx'],
                    'y': data['gy'],
                    'z': data['gz']
                },
                'orientation': {
                    'roll': data['roll'],
                    'pitch': data['pitch']
                },
                'temperature': data['temp'],
                'jerk': data['jerk'],
                'magnitude': data['accel_mag']
            },
            'metadata': {
                'timestamp': data['timestamp'],
                'data_source': data['data_source'],
                'sensor': 'MPU6050'
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}',
            'timestamp': time.time()
        }), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """API endpoint to get server status"""
    return jsonify({
        'status': 'running',
        'mpu_available': mpu_server.mpu_reader is not None,
        'data_source': 'real' if mpu_server.mpu_reader else 'mock',
        'last_data_time': mpu_server.latest_data['timestamp'] if mpu_server.latest_data else None,
        'timestamp': time.time()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'MPU6050 API Server'
    })

if __name__ == '__main__':
    print("🚀 Starting MPU6050 API Server...")
    print("📍 Endpoints:")
    print("   - GET /api/data - Get latest sensor data")
    print("   - GET /api/status - Get server status")
    print("   - GET /health - Health check")
    print()
    
    try:
        # Run on all interfaces so the main server can access it
        app.run(host='0.0.0.0', port=8087, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\n⏹️  Shutting down MPU API Server...")
        mpu_server.stop_data_collection()
    except Exception as e:
        print(f"❌ Server error: {e}")
        mpu_server.stop_data_collection()

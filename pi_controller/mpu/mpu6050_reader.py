#!/usr/bin/env python3
"""
MPU6050/MPU9250 (without magnetometer) Python implementation
Mimics the Arduino code functionality for Raspberry Pi
"""

from mpu6050 import mpu6050
import time
import math

class MPU6050Reader:
    def __init__(self, address=0x68, bus=1):  # Use bus 1 for standard Pi I2C
        """Initialize the MPU6050 sensor"""
        self.sensor = mpu6050(address, bus)
        self.prev_accel_mag = 0
        self.JERK_SENSITIVITY = 0.6  # Adjustable sensitivity threshold (in g's)
        self.bus_number = bus
        
    def setup(self):
        """Setup function - similar to Arduino setup()"""
        print("MPU6050 Reader Starting...")
        print(f"Using I2C bus: {self.bus_number}")
        print("Jerk sensitivity:", self.JERK_SENSITIVITY)
        print("-" * 60)
        
    def calculate_roll_pitch(self, ax, ay, az):
        """Calculate roll and pitch from accelerometer data"""
        # Convert to degrees (similar to Arduino code)
        roll = math.atan2(ay, az) * 180 / math.pi
        pitch = math.atan2(-ax, math.sqrt(ay * ay + az * az)) * 180 / math.pi
        return roll, pitch
        
    def detect_jerk(self, accel_mag):
        """Detect sudden movement (jerk) based on acceleration magnitude change"""
        jerk = 0
        if abs(accel_mag - self.prev_accel_mag) > self.JERK_SENSITIVITY:
            jerk = 1
        self.prev_accel_mag = accel_mag
        return jerk
        
    def read_sensor_data(self):
        """Read all sensor data and return formatted values"""
        try:
            # Get accelerometer data (in g's)
            accel_data = self.sensor.get_accel_data()
            ax = accel_data['x']
            ay = accel_data['y'] 
            az = accel_data['z']
            
            # Get gyroscope data (in degrees/sec)
            gyro_data = self.sensor.get_gyro_data()
            gx = gyro_data['x']
            gy = gyro_data['y']
            gz = gyro_data['z']
            
            # Get temperature (in Celsius)
            temp_c = self.sensor.get_temp()
            
            # Calculate roll and pitch
            roll, pitch = self.calculate_roll_pitch(ax, ay, az)
            
            # Calculate total acceleration magnitude
            accel_mag = math.sqrt(ax * ax + ay * ay + az * az)
            
            # Detect jerk
            jerk = self.detect_jerk(accel_mag)
            
            return {
                'ax': ax, 'ay': ay, 'az': az,
                'gx': gx, 'gy': gy, 'gz': gz,
                'temp': temp_c,
                'roll': roll, 'pitch': pitch,
                'jerk': jerk,
                'accel_mag': accel_mag
            }
            
        except Exception as e:
            print(f"Error reading sensor: {e}")
            return None
            
    def print_data(self, data):
        """Print data in Arduino Serial format"""
        if data is None:
            return
            
        # Format output to match Arduino serial output
        output = (f"aX:{data['ax']:.2f}\t"
                 f"aY:{data['ay']:.2f}\t" 
                 f"aZ:{data['az']:.2f}\t"
                 f"Temp:{data['temp']:.2f}°C\t"
                 f"Roll:{data['roll']:.2f}°\t"
                 f"Pitch:{data['pitch']:.2f}°\t"
                 f"jerk:{data['jerk']}")
        
        print(output)
        
    def loop(self):
        """Main loop - similar to Arduino loop()"""
        while True:
            try:
                data = self.read_sensor_data()
                self.print_data(data)
                time.sleep(0.2)  # 200ms delay to match Arduino code
                
            except KeyboardInterrupt:
                print("\nExiting...")
                break
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(1)

def main():
    """Main function"""
    try:
        print("Initializing MPU6050...")
        
        # Test I2C connectivity first - try multiple buses for Pi 5
        try:
            import smbus
            buses_to_try = [1, 4, 6, 10, 11, 13, 14]  # Common I2C buses on Pi 5
            found_mpu = False
            
            for bus_num in buses_to_try:
                try:
                    bus = smbus.SMBus(bus_num)
                    # Try to read WHO_AM_I register
                    who_am_i = bus.read_byte_data(0x68, 0x75)
                    print(f"MPU6050 found on I2C bus {bus_num}, WHO_AM_I: 0x{who_am_i:02X}")
                    bus.close()
                    found_mpu = True
                    break
                except Exception as e:
                    try:
                        bus.close()
                    except:
                        pass
                    continue
            
            if not found_mpu:
                print("MPU6050 not found on any I2C bus")
                print("Checking available I2C devices...")
                for bus_num in buses_to_try:
                    try:
                        import subprocess
                        result = subprocess.run(['i2cdetect', '-y', str(bus_num)], 
                                              capture_output=True, text=True)
                        if result.returncode == 0 and '68' in result.stdout:
                            print(f"Device found at 0x68 on bus {bus_num}")
                    except:
                        continue
                return
                        
        except Exception as i2c_error:
            print(f"I2C connection test failed: {i2c_error}")
            print("Please check wiring and I2C configuration")
            return
        
        # Create MPU6050 reader instance using bus 1 (standard I2C bus)
        mpu_reader = MPU6050Reader(bus=1)
        
        # Setup
        mpu_reader.setup()
        
        # Start main loop
        mpu_reader.loop()
        
    except Exception as e:
        print(f"Failed to initialize MPU6050: {e}")
        print("\nTroubleshooting steps:")
        print("1. I2C is enabled (sudo raspi-config)")
        print("2. MPU6050 is connected properly")
        print("3. Address 0x68 is detected (i2cdetect -y 1)")
        print("4. Run with virtual environment: ./run_mpu6050.sh")
        print("5. Or install packages manually:")
        print("   pip install --break-system-packages mpu6050-raspberrypi smbus2")

if __name__ == "__main__":
    main()

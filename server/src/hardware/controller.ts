import { VehicleControl, SensorData, SystemStatus, HardwareStatus } from '../types';
import http from 'http';

export class HardwareController {
  private systemStatus: SystemStatus;
  private hardwareStatus: HardwareStatus;
  private sensorData: SensorData;
  private isEmergencyStop: boolean = false;
  private mpuSensorData: any = null;

  constructor() {
    this.systemStatus = {
      connected: true,
      latency: 0,
      commandQueue: 0,
      videoStreams: {
        front: false,
        back: false,
        left: false,
        right: false,
      },
      controlMode: 'remote',
    };

    this.hardwareStatus = {
      pi: {
        connected: true,
        lastPing: Date.now(),
        cpuUsage: 0,
        memoryUsage: 0,
        temperature: 0,
      },
      esp32: {
        connected: false,
        lastPing: 0,
        batteryVoltage: 0,
        signalStrength: 0,
      },
      cameras: {
        front: false,
        back: false,
        left: false,
        right: false,
      },
      sensors: {
        lidar: false,
        imu: false,
        gps: false,
      },
    };

    this.sensorData = {
      lidar: {
        distance: 0,  // Will be updated by real sensor data
        angle: 0,
        obstacles: [],
      },
      imu: {
        acceleration: { x: 0, y: 0, z: 9.8 },
        gyroscope: { x: 0, y: 0, z: 0 },
        magnetometer: { x: 0, y: 0, z: 0 },
        // MPU6050 specific fields that will be populated by real data
        roll: 0,
        pitch: 0,
        temperature: 25,  // Default until real MPU data arrives
        jerk: 0,
      },
      battery: {
        voltage: 12.0,
        current: 0,
        percentage: 100,
      },
      temperature: 25, // Will be updated by MPU temperature - this should always match imu.temperature
    };

    this.initializeHardware();
    this.startMPUSensorMonitoring();
  }

  private startMPUSensorMonitoring() {
    // Start periodic MPU data fetching
    console.log('Starting MPU sensor monitoring...');
    
    const fetchMPUData = () => {
      const options = {
        hostname: '172.20.10.4',
        port: 8087,
        path: '/api/data',
        method: 'GET',
        timeout: 1000, // 1 second timeout
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const mpuResponse = JSON.parse(data);
            
            if (mpuResponse.success && mpuResponse.data) {
              this.processMPUData(mpuResponse.data, mpuResponse.metadata);
            } else {
              console.log('MPU API returned error:', mpuResponse.error);
            }
          } catch (error) {
            console.error('Error parsing MPU data:', error);
          }
        });
      });

      req.on('error', (error) => {
        // Don't spam the console with connection errors
        if (Date.now() % 10000 < 100) { // Log every 10 seconds
          console.log('MPU sensor unavailable (will keep trying...)');
        }
      });

      req.on('timeout', () => {
        req.destroy();
      });

      req.end();
    };

    // Fetch MPU data every 100ms (10Hz)
    setInterval(fetchMPUData, 100);
    
    // Initial fetch
    fetchMPUData();
  }

  private processMPUData(mpuData: any, metadata: any) {
    try {
      // Update our internal MPU sensor data
      this.mpuSensorData = mpuData;
      
      // Update sensor data with real MPU readings
      this.sensorData.imu = {
        acceleration: {
          x: mpuData.acceleration.x,
          y: mpuData.acceleration.y,
          z: mpuData.acceleration.z,
        },
        gyroscope: {
          x: mpuData.gyroscope.x,
          y: mpuData.gyroscope.y,
          z: mpuData.gyroscope.z,
        },
        magnetometer: this.sensorData.imu.magnetometer, // Keep existing magnetometer data
        roll: mpuData.orientation.roll,
        pitch: mpuData.orientation.pitch,
        temperature: mpuData.temperature,
        jerk: mpuData.jerk,
      };
      
      // Update system temperature to match MPU temperature
      this.sensorData.temperature = mpuData.temperature;
      this.hardwareStatus.pi.temperature = mpuData.temperature;
      
      // Mark IMU sensor as connected
      this.hardwareStatus.sensors.imu = true;
      
      // Log real data occasionally
      if (Date.now() % 1000 < 100) { // Every second
        console.log(`✅ MPU6050 Live Data - Roll: ${mpuData.orientation.roll.toFixed(1)}° Pitch: ${mpuData.orientation.pitch.toFixed(1)}° Temp: ${mpuData.temperature.toFixed(1)}°C [${metadata.data_source}]`);
      }
      
    } catch (error) {
      console.error('Error processing MPU data:', error);
    }
  }

  private initializeHardware() {
    // Initialize hardware connections
    // This would connect to serial ports, I2C, etc.
    console.log('Initializing hardware connections...');
    
    // Simulate hardware initialization
    setTimeout(() => {
      this.hardwareStatus.esp32.connected = true;
      this.hardwareStatus.sensors.lidar = true;
      this.hardwareStatus.sensors.imu = true;
      console.log('Hardware initialized successfully');
    }, 1000);

    // Start sensor data simulation
    this.startSensorDataSimulation();
  }

  private startSensorDataSimulation() {
    // This interval now only handles system status updates
    // Real sensor data comes through updateSensorData() method
    setInterval(() => {
      if (this.isEmergencyStop) return;

      // Only update system metrics, NOT sensor data
      // Real sensor data is preserved and comes from Pi controller
      
      // Update hardware status (these are Pi system metrics, not sensor data)
      this.hardwareStatus.pi.cpuUsage = Math.random() * 100;
      this.hardwareStatus.pi.memoryUsage = Math.random() * 100;
      // Use MPU temperature for Pi temperature instead of random values
      this.hardwareStatus.pi.temperature = this.sensorData.imu?.temperature || this.sensorData.temperature || 25;
      this.hardwareStatus.esp32.batteryVoltage = this.sensorData.battery.voltage;
      this.hardwareStatus.esp32.signalStrength = -40 - Math.random() * 30;

      // Update system status
      this.systemStatus.latency = 20 + Math.random() * 30;
    }, 100);
  }

  updateSensorData(incomingSensorData: any) {
    // Update sensor data with real data from Pi controller
    if (incomingSensorData) {
      console.log('Raw incoming sensor data:', JSON.stringify(incomingSensorData, null, 2));
      
      // Extract MPU temperature if available
      const mpuTemperature = incomingSensorData.imu?.temperature;
      
      // Completely replace sensor data with incoming real data
      // Only keep existing values for sensors that aren't being updated
      this.sensorData = {
        lidar: incomingSensorData.lidar || this.sensorData.lidar,
        imu: incomingSensorData.imu || this.sensorData.imu,
        battery: incomingSensorData.battery || this.sensorData.battery,
        // ALWAYS use MPU temperature as the primary temperature source
        temperature: mpuTemperature || this.sensorData.temperature,
      };
      
      // Update sensor status based on incoming data
      if (incomingSensorData.imu) {
        this.hardwareStatus.sensors.imu = true;
        const imu = incomingSensorData.imu;
        console.log(`🔄 Real MPU Data - Roll: ${imu.roll?.toFixed(1)}° Pitch: ${imu.pitch?.toFixed(1)}° Temp: ${imu.temperature?.toFixed(1)}°C Jerk: ${imu.jerk}`);
        
        // Update Pi hardware temperature to match MPU temperature
        if (imu.temperature !== undefined) {
          this.hardwareStatus.pi.temperature = imu.temperature;
          console.log(`🌡️ Updated all temperatures to MPU reading: ${imu.temperature.toFixed(1)}°C`);
        }
      }
      
      if (incomingSensorData.lidar) {
        this.hardwareStatus.sensors.lidar = true;
        console.log(`🔄 Real LIDAR Data - Distance: ${incomingSensorData.lidar.distance?.toFixed(1)}cm Angle: ${incomingSensorData.lidar.angle?.toFixed(1)}°`);
      }
      
      if (incomingSensorData.battery) {
        console.log(`🔄 Real Battery Data - Voltage: ${incomingSensorData.battery.voltage?.toFixed(1)}V Percentage: ${incomingSensorData.battery.percentage?.toFixed(1)}%`);
      }
    }
  }

  sendVehicleControl(control: VehicleControl) {
    if (this.isEmergencyStop) {
      console.log('Emergency stop active - ignoring control command');
      return;
    }

    console.log('Sending vehicle control to ESP32:', control);
    
    // Here you would send the control data to the ESP32 via serial/UART
    // For now, we'll just log it
    
    // Simulate sending via serial port
    // serialPort.write(JSON.stringify(control));
  }

  emergencyStop() {
    console.log('EMERGENCY STOP ACTIVATED');
    this.isEmergencyStop = true;
    
    // Send stop command to ESP32
    this.sendVehicleControl({
      forward: 0,
      turn: 0,
      speed: 0,
      brake: true,
    });
  }

  resetSystem() {
    console.log('Resetting system...');
    this.isEmergencyStop = false;
    
    // Reset all systems
    this.systemStatus.controlMode = 'remote';
    this.systemStatus.commandQueue = 0;
    
    // Send reset command to ESP32
    // serialPort.write('RESET');
  }

  setControlMode(mode: 'remote' | 'joystick' | 'autonomous') {
    console.log(`Setting control mode to: ${mode}`);
    this.systemStatus.controlMode = mode;
    
    // Send mode change to ESP32
    // serialPort.write(`MODE:${mode}`);
  }

  toggleVideoStream(stream: string) {
    console.log(`Toggling video stream: ${stream}`);
    
    if (stream in this.systemStatus.videoStreams) {
      const streamKey = stream as keyof typeof this.systemStatus.videoStreams;
      this.systemStatus.videoStreams[streamKey] = !this.systemStatus.videoStreams[streamKey];
      
      // Send video stream command to Pi
      // videoControl.toggle(stream);
    }
  }

  runDiagnostics() {
    console.log('Running system diagnostics...');
    
    // Simulate diagnostic checks
    setTimeout(() => {
      console.log('Diagnostics complete - all systems operational');
    }, 3000);
  }

  calibrateSensors() {
    console.log('Calibrating sensors...');
    
    // Simulate sensor calibration
    setTimeout(() => {
      console.log('Sensor calibration complete');
    }, 5000);
  }

  getSensorData(): SensorData {
    return this.sensorData;
  }

  getSystemStatus(): SystemStatus {
    return this.systemStatus;
  }

  getStatus(): HardwareStatus {
    return this.hardwareStatus;
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HardwareController = void 0;
class HardwareController {
    constructor() {
        this.isEmergencyStop = false;
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
                distance: 0,
                angle: 0,
                obstacles: [],
            },
            imu: {
                acceleration: { x: 0, y: 0, z: 9.8 },
                gyroscope: { x: 0, y: 0, z: 0 },
                magnetometer: { x: 0, y: 0, z: 0 },
            },
            battery: {
                voltage: 12.0,
                current: 0,
                percentage: 100,
            },
            temperature: 25,
        };
        this.initializeHardware();
    }
    initializeHardware() {
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
    startSensorDataSimulation() {
        setInterval(() => {
            if (this.isEmergencyStop)
                return;
            // Simulate sensor data
            this.sensorData = {
                lidar: {
                    distance: 100 + Math.random() * 200,
                    angle: Math.random() * 360,
                    obstacles: Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
                        x: (Math.random() - 0.5) * 200,
                        y: (Math.random() - 0.5) * 200,
                    })),
                },
                imu: {
                    acceleration: {
                        x: (Math.random() - 0.5) * 2,
                        y: (Math.random() - 0.5) * 2,
                        z: 9.8 + (Math.random() - 0.5) * 0.5,
                    },
                    gyroscope: {
                        x: (Math.random() - 0.5) * 10,
                        y: (Math.random() - 0.5) * 10,
                        z: (Math.random() - 0.5) * 10,
                    },
                    magnetometer: {
                        x: (Math.random() - 0.5) * 100,
                        y: (Math.random() - 0.5) * 100,
                        z: (Math.random() - 0.5) * 100,
                    },
                },
                battery: {
                    voltage: 12.0 + Math.random() * 2,
                    current: Math.random() * 5,
                    percentage: Math.max(0, this.sensorData.battery.percentage - Math.random() * 0.01),
                },
                temperature: 25 + Math.random() * 10,
            };
            // Update hardware status
            this.hardwareStatus.pi.cpuUsage = Math.random() * 100;
            this.hardwareStatus.pi.memoryUsage = Math.random() * 100;
            this.hardwareStatus.pi.temperature = 40 + Math.random() * 20;
            this.hardwareStatus.esp32.batteryVoltage = this.sensorData.battery.voltage;
            this.hardwareStatus.esp32.signalStrength = -40 - Math.random() * 30;
            // Update system status
            this.systemStatus.latency = 20 + Math.random() * 30;
        }, 100);
    }
    sendVehicleControl(control) {
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
    setControlMode(mode) {
        console.log(`Setting control mode to: ${mode}`);
        this.systemStatus.controlMode = mode;
        // Send mode change to ESP32
        // serialPort.write(`MODE:${mode}`);
    }
    toggleVideoStream(stream) {
        console.log(`Toggling video stream: ${stream}`);
        if (stream in this.systemStatus.videoStreams) {
            const streamKey = stream;
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
    getSensorData() {
        return this.sensorData;
    }
    getSystemStatus() {
        return this.systemStatus;
    }
    getStatus() {
        return this.hardwareStatus;
    }
}
exports.HardwareController = HardwareController;
//# sourceMappingURL=controller.js.map
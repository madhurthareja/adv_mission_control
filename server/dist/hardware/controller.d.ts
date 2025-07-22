import { VehicleControl, SensorData, SystemStatus, HardwareStatus } from '../types';
export declare class HardwareController {
    private systemStatus;
    private hardwareStatus;
    private sensorData;
    private isEmergencyStop;
    constructor();
    private initializeHardware;
    private startSensorDataSimulation;
    sendVehicleControl(control: VehicleControl): void;
    emergencyStop(): void;
    resetSystem(): void;
    setControlMode(mode: 'remote' | 'joystick' | 'autonomous'): void;
    toggleVideoStream(stream: string): void;
    runDiagnostics(): void;
    calibrateSensors(): void;
    getSensorData(): SensorData;
    getSystemStatus(): SystemStatus;
    getStatus(): HardwareStatus;
}
//# sourceMappingURL=controller.d.ts.map
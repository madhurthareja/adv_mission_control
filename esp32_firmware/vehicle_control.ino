/*
 * ESP32 Vehicle Control Firmware
 * Mission Control System - Motor Driver with Joystick Override
 * 
 * Priority: Physical Joystick > Remote Commands > Autonomous
 */

#include <WiFi.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>

// Motor driver pins (L298N)
#define MOTOR_LEFT_A 18
#define MOTOR_LEFT_B 19
#define MOTOR_RIGHT_A 20
#define MOTOR_RIGHT_B 21
#define MOTOR_LEFT_PWM 22
#define MOTOR_RIGHT_PWM 23

// Joystick pins
#define JOYSTICK_X 34
#define JOYSTICK_Y 35
#define JOYSTICK_BUTTON 32

// LED indicators
#define LED_WIFI 2
#define LED_CONTROL 4
#define LED_JOYSTICK 5

// System constants
#define JOYSTICK_DEADZONE 100
#define JOYSTICK_THRESHOLD 200
#define SERIAL_BAUDRATE 115200
#define COMMAND_TIMEOUT 1000  // ms

// Control modes
enum ControlMode {
  MODE_REMOTE,
  MODE_JOYSTICK,
  MODE_AUTONOMOUS
};

// Control structure
struct VehicleControl {
  int forward;    // -100 to 100
  int turn;       // -100 to 100
  int speed;      // 0 to 100
  bool brake;
};

// Global variables
ControlMode currentMode = MODE_REMOTE;
VehicleControl remoteControl = {0, 0, 50, false};
VehicleControl joystickControl = {0, 0, 50, false};
VehicleControl activeControl = {0, 0, 50, false};

unsigned long lastRemoteCommand = 0;
unsigned long lastJoystickRead = 0;
bool emergencyStop = false;
bool joystickActive = false;

void setup() {
  Serial.begin(SERIAL_BAUDRATE);
  
  // Initialize pins
  setupMotorPins();
  setupJoystickPins();
  setupLEDs();
  
  // Initialize systems
  Serial.println("ESP32 Vehicle Controller Starting...");
  Serial.println("Priority: Joystick > Remote > Autonomous");
  
  // Test motors
  testMotors();
  
  Serial.println("✅ ESP32 Vehicle Controller Ready");
}

void loop() {
  // Read joystick input
  readJoystick();
  
  // Process serial commands from Pi
  processSerialCommands();
  
  // Determine control priority
  determineControlPriority();
  
  // Apply motor control
  applyMotorControl();
  
  // Update LEDs
  updateLEDs();
  
  // Check for timeouts
  checkTimeouts();
  
  delay(20); // 50Hz control loop
}

void setupMotorPins() {
  pinMode(MOTOR_LEFT_A, OUTPUT);
  pinMode(MOTOR_LEFT_B, OUTPUT);
  pinMode(MOTOR_RIGHT_A, OUTPUT);
  pinMode(MOTOR_RIGHT_B, OUTPUT);
  pinMode(MOTOR_LEFT_PWM, OUTPUT);
  pinMode(MOTOR_RIGHT_PWM, OUTPUT);
  
  // Initialize PWM
  ledcSetup(0, 1000, 8); // Channel 0, 1kHz, 8-bit resolution
  ledcSetup(1, 1000, 8); // Channel 1, 1kHz, 8-bit resolution
  ledcAttachPin(MOTOR_LEFT_PWM, 0);
  ledcAttachPin(MOTOR_RIGHT_PWM, 1);
}

void setupJoystickPins() {
  pinMode(JOYSTICK_X, INPUT);
  pinMode(JOYSTICK_Y, INPUT);
  pinMode(JOYSTICK_BUTTON, INPUT_PULLUP);
}

void setupLEDs() {
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_CONTROL, OUTPUT);
  pinMode(LED_JOYSTICK, OUTPUT);
}

void testMotors() {
  Serial.println("Testing motors...");
  
  // Test left motor
  setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, 50);
  delay(500);
  setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, 0);
  
  // Test right motor
  setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, 50);
  delay(500);
  setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, 0);
  
  Serial.println("✅ Motor test complete");
}

void readJoystick() {
  if (millis() - lastJoystickRead < 50) return; // 20Hz joystick reading
  
  lastJoystickRead = millis();
  
  int xValue = analogRead(JOYSTICK_X);
  int yValue = analogRead(JOYSTICK_Y);
  bool buttonPressed = !digitalRead(JOYSTICK_BUTTON);
  
  // Convert to control values (-100 to 100)
  int xCentered = xValue - 2048; // Center around 0
  int yCentered = yValue - 2048;
  
  // Apply deadzone
  if (abs(xCentered) < JOYSTICK_DEADZONE) xCentered = 0;
  if (abs(yCentered) < JOYSTICK_DEADZONE) yCentered = 0;
  
  // Check if joystick is actively being used
  joystickActive = (abs(xCentered) > JOYSTICK_THRESHOLD || 
                   abs(yCentered) > JOYSTICK_THRESHOLD || 
                   buttonPressed);
  
  if (joystickActive) {
    // Convert to control values
    joystickControl.forward = map(yCentered, -2048, 2048, -100, 100);
    joystickControl.turn = map(xCentered, -2048, 2048, -100, 100);
    joystickControl.brake = buttonPressed;
    
    currentMode = MODE_JOYSTICK;
  }
}

void processSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() > 0) {
      parseCommand(command);
    }
  }
}

void parseCommand(String command) {
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, command);
  
  if (error) {
    Serial.println("❌ JSON parsing failed");
    return;
  }
  
  String cmd = doc["cmd"];
  
  if (cmd == "move") {
    // Remote control command
    remoteControl.forward = doc["forward"];
    remoteControl.turn = doc["turn"];
    remoteControl.speed = doc["speed"];
    remoteControl.brake = doc["brake"];
    
    lastRemoteCommand = millis();
    
    // Only use remote control if joystick is not active
    if (!joystickActive) {
      currentMode = MODE_REMOTE;
    }
    
    Serial.print("Remote control: F=");
    Serial.print(remoteControl.forward);
    Serial.print(" T=");
    Serial.print(remoteControl.turn);
    Serial.print(" S=");
    Serial.print(remoteControl.speed);
    Serial.print(" B=");
    Serial.println(remoteControl.brake);
    
  } else if (cmd == "emergency_stop") {
    emergencyStop = true;
    Serial.println("🛑 EMERGENCY STOP ACTIVATED");
    
  } else if (cmd == "reset") {
    emergencyStop = false;
    Serial.println("🔄 System reset");
    
  } else if (cmd.startsWith("set_mode:")) {
    String mode = cmd.substring(9);
    if (mode == "remote") currentMode = MODE_REMOTE;
    else if (mode == "joystick") currentMode = MODE_JOYSTICK;
    else if (mode == "autonomous") currentMode = MODE_AUTONOMOUS;
    
    Serial.print("Mode set to: ");
    Serial.println(mode);
  }
}

void determineControlPriority() {
  if (emergencyStop) {
    // Emergency stop overrides everything
    activeControl = {0, 0, 0, true};
    return;
  }
  
  if (joystickActive) {
    // Physical joystick has highest priority
    activeControl = joystickControl;
    currentMode = MODE_JOYSTICK;
  } else if (millis() - lastRemoteCommand < COMMAND_TIMEOUT) {
    // Remote commands if recent
    activeControl = remoteControl;
    currentMode = MODE_REMOTE;
  } else {
    // No active control - stop
    activeControl = {0, 0, 0, false};
  }
}

void applyMotorControl() {
  if (activeControl.brake || emergencyStop) {
    // Emergency brake
    setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, 0);
    setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, 0);
    return;
  }
  
  // Calculate left and right motor speeds
  int baseSpeed = map(abs(activeControl.forward), 0, 100, 0, activeControl.speed);
  int turnAdjustment = map(abs(activeControl.turn), 0, 100, 0, baseSpeed);
  
  int leftSpeed = baseSpeed;
  int rightSpeed = baseSpeed;
  
  // Apply turning
  if (activeControl.turn > 0) {
    // Turn right - slow down right motor
    rightSpeed = max(0, rightSpeed - turnAdjustment);
  } else if (activeControl.turn < 0) {
    // Turn left - slow down left motor
    leftSpeed = max(0, leftSpeed - turnAdjustment);
  }
  
  // Apply direction
  if (activeControl.forward > 0) {
    // Forward
    setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, leftSpeed);
    setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, rightSpeed);
  } else if (activeControl.forward < 0) {
    // Reverse
    setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, -leftSpeed);
    setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, -rightSpeed);
  } else {
    // Stop
    setMotorSpeed(MOTOR_LEFT_A, MOTOR_LEFT_B, 0, 0);
    setMotorSpeed(MOTOR_RIGHT_A, MOTOR_RIGHT_B, 1, 0);
  }
}

void setMotorSpeed(int pinA, int pinB, int channel, int speed) {
  if (speed > 0) {
    // Forward
    digitalWrite(pinA, HIGH);
    digitalWrite(pinB, LOW);
    ledcWrite(channel, speed);
  } else if (speed < 0) {
    // Reverse
    digitalWrite(pinA, LOW);
    digitalWrite(pinB, HIGH);
    ledcWrite(channel, abs(speed));
  } else {
    // Stop
    digitalWrite(pinA, LOW);
    digitalWrite(pinB, LOW);
    ledcWrite(channel, 0);
  }
}

void updateLEDs() {
  // WiFi LED (always on for now)
  digitalWrite(LED_WIFI, HIGH);
  
  // Control mode LED
  if (currentMode == MODE_JOYSTICK) {
    digitalWrite(LED_CONTROL, HIGH);
  } else {
    digitalWrite(LED_CONTROL, (millis() / 500) % 2); // Blink for remote
  }
  
  // Joystick active LED
  digitalWrite(LED_JOYSTICK, joystickActive);
}

void checkTimeouts() {
  // Check for remote command timeout
  if (millis() - lastRemoteCommand > COMMAND_TIMEOUT * 2) {
    // If no commands for 2 seconds, stop
    if (currentMode == MODE_REMOTE && !joystickActive) {
      activeControl = {0, 0, 0, false};
    }
  }
}

void sendStatus() {
  StaticJsonDocument<300> doc;
  doc["status"] = "ok";
  doc["mode"] = currentMode;
  doc["joystick_active"] = joystickActive;
  doc["emergency_stop"] = emergencyStop;
  doc["control"]["forward"] = activeControl.forward;
  doc["control"]["turn"] = activeControl.turn;
  doc["control"]["speed"] = activeControl.speed;
  doc["control"]["brake"] = activeControl.brake;
  
  serializeJson(doc, Serial);
  Serial.println();
}

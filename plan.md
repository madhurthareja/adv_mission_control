---

### 📄 `plan.md` (Dev Plan / Roadmap)

# Development Plan: Mission Control System

This document outlines the high-level development roadmap, modular responsibilities, and goals for each phase of the project.

---

## 🧠 Objective

Create a fully remote-controlled robotics platform using:
- A web-based GUI (Mission Control)
- A Raspberry Pi 5 (controller node)
- An ESP32 motor driver (onboard logic)
- A cloud-accessible relay server
- Priority-based control switching (joystick > remote)

---

## 🧩 Modules Overview

| Module           | Responsibility                          | Owner |
|------------------|------------------------------------------|-------|
| `frontend/`       | GUI for cameras, sensors, and control   | Web Dev |
| `backend/`        | Relay commands & video routing          | Fullstack |
| `pi_controller/`  | Sensor acquisition, camera streaming    | Embedded Dev |
| `esp32_firmware/` | Direct motor control & joystick logic   | Embedded Dev |

---

## 🗂️ Milestones

### 📦 Phase 1: Hardware + Streaming Setup (Week 1-2)
- [x] Connect all 4 cameras to Pi
- [x] Stream each camera using `ffmpeg` or `libcamera`
- [x] Build basic ESP32 sketch to read joystick + run motors
- [x] Set up Pi ↔ ESP32 communication via UART/I2C

### 🖥️ Phase 2: Frontend Dashboard (Week 3-4)
- [ ] **Video Feed Grid**: 4-panel camera display with fullscreen toggle
- [ ] **Control Interface**: Virtual joystick + keyboard controls
- [ ] **Sensor Dashboard**: Real-time LIDAR, IMU, battery status
- [ ] **System Status**: Connection status, latency, command queue
- [ ] **WebSocket Integration**: Real-time bidirectional communication
- [ ] **Responsive Design**: Mobile-friendly control interface

### 🔌 Phase 3: Backend Infrastructure (Week 5)
- [ ] **Express Server**: REST API for configuration
- [ ] **Socket.IO Server**: Real-time WebSocket communication
- [ ] **Command Queue**: Priority-based control system
- [ ] **Hardware Bridge**: Serial/UART communication with Pi
- [ ] **Video Proxy**: Stream relay and bandwidth management
- [ ] **Authentication**: JWT-based session management

### 🌍 Phase 4: Remote Control Infrastructure (Week 6)
- [ ] Deploy backend server (AWS, fly.io, or Heroku)
- [ ] Setup ngrok or Cloudflare tunnel from Pi
- [ ] Add auth + device handshake

### 📈 Phase 5: Diagnostics and Stability (Week 7)
- [ ] Add joystick/Pi logging on ESP32
- [ ] Add live sensor plots to frontend
- [ ] Benchmark video latency + frame drop

### ✅ Phase 6: Finalization (Week 8)
- [ ] Documentation + auto-deploy scripts
- [ ] First full test from remote machine
- [ ] Record and evaluate performance

---

## 🔄 Workflow

- Git branching: `main` → production, `dev` → active development
- PR review process: 1 approval minimum
- Use GitHub Projects or Notion for task tracking

---

## 🧰 Tools & Services

- GitHub / GitHub Actions (CI/CD)
- ngrok or Cloudflare Tunnel (dev tunneling)
- Docker (optional for backend)
- ESP-IDF Monitor or Arduino Serial

---

## 🔐 Security Priorities

- WebSocket auth using JWT
- Rate limit command inputs
- Add basic password gate for Mission Control access
- Encrypt Pi ↔ ESP32 messages (optional)

---

## 📦 Deliverables

- Web GUI with live camera + sensors
- ESP32 firmware with local override logic
- Streaming + control backend with socket relays
- Raspberry Pi scripts for sensor, video, and control integration
- Deployment and dev documentation


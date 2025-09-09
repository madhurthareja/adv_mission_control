#!/bin/bash
# Installation script for MPU6050 reader dependencies

echo "Installing MPU6050 dependencies for Raspberry Pi..."

# Update package list
echo "Updating package list..."
sudo apt update

# Install I2C tools and Python SMBus
echo "Installing I2C tools and Python SMBus..."
sudo apt install i2c-tools python3-smbus python3-pip -y

# Install Python MPU6050 library
echo "Installing Python MPU6050 library..."
pip3 install mpu6050-raspberrypi

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Enable I2C interface: sudo raspi-config -> Interface Options -> I2C -> Enable"
echo "2. Reboot: sudo reboot"
echo "3. Check I2C connection: i2cdetect -y 1"
echo "4. Run the Python script: python3 mpu6050_reader.py"
echo ""

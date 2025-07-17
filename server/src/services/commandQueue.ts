import { CommandPacket } from '../types';

export class CommandQueue {
  private queue: CommandPacket[] = [];
  private processing: boolean = false;
  private maxQueueSize = 100;

  addCommand(command: CommandPacket) {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Command queue full, dropping oldest command');
      this.queue.shift();
    }

    // Insert command based on priority
    const insertIndex = this.findInsertIndex(command);
    this.queue.splice(insertIndex, 0, command);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private findInsertIndex(command: CommandPacket): number {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[command.priority] <= priorityOrder[this.queue[i].priority]) {
        return i;
      }
    }
    
    return this.queue.length;
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const command = this.queue.shift();
      if (command) {
        try {
          await this.executeCommand(command);
        } catch (error) {
          console.error('Error executing command:', error);
        }
      }
    }

    this.processing = false;
  }

  private async executeCommand(command: CommandPacket) {
    console.log(`Executing command: ${command.type} with priority: ${command.priority}`);
    
    // Add small delay for non-high priority commands
    if (command.priority !== 'high') {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Command execution would happen here
    // For now, just log the execution
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.processing = false;
  }

  getQueueStatus() {
    return {
      size: this.queue.length,
      processing: this.processing,
      commands: this.queue.map(cmd => ({
        id: cmd.id,
        type: cmd.type,
        priority: cmd.priority,
        timestamp: cmd.timestamp
      }))
    };
  }
}

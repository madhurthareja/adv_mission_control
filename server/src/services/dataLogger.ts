import { LogEntry } from '../types';

export class DataLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  logCommand(command: string, data: any) {
    this.addLog('info', 'command', `Command executed: ${command}`, data);
  }

  logError(source: string, error: any) {
    this.addLog('error', source, error.message || error.toString(), error);
  }

  logInfo(source: string, message: string, data?: any) {
    this.addLog('info', source, message, data);
  }

  logWarning(source: string, message: string, data?: any) {
    this.addLog('warn', source, message, data);
  }

  private addLog(level: 'info' | 'warn' | 'error', source: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      data
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output for debugging
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`[${timestamp}] ${level.toUpperCase()} - ${source}: ${message}`);
  }

  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }

  getLogsByLevel(level: 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source);
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getLogStats() {
    const stats = {
      total: this.logs.length,
      info: 0,
      warn: 0,
      error: 0,
      sources: new Set<string>()
    };

    this.logs.forEach(log => {
      stats[log.level]++;
      stats.sources.add(log.source);
    });

    return {
      ...stats,
      sources: Array.from(stats.sources)
    };
  }
}

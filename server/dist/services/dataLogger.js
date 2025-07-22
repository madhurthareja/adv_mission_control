"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLogger = void 0;
class DataLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }
    logCommand(command, data) {
        this.addLog('info', 'command', `Command executed: ${command}`, data);
    }
    logError(source, error) {
        this.addLog('error', source, error.message || error.toString(), error);
    }
    logInfo(source, message, data) {
        this.addLog('info', source, message, data);
    }
    logWarning(source, message, data) {
        this.addLog('warn', source, message, data);
    }
    addLog(level, source, message, data) {
        const entry = {
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
    getLogs(limit) {
        if (limit) {
            return this.logs.slice(-limit);
        }
        return [...this.logs];
    }
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    getLogsBySource(source) {
        return this.logs.filter(log => log.source === source);
    }
    clearLogs() {
        this.logs = [];
    }
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
    getLogStats() {
        const stats = {
            total: this.logs.length,
            info: 0,
            warn: 0,
            error: 0,
            sources: new Set()
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
exports.DataLogger = DataLogger;
//# sourceMappingURL=dataLogger.js.map
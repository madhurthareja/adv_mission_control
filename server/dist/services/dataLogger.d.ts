import { LogEntry } from '../types';
export declare class DataLogger {
    private logs;
    private maxLogs;
    logCommand(command: string, data: any): void;
    logError(source: string, error: any): void;
    logInfo(source: string, message: string, data?: any): void;
    logWarning(source: string, message: string, data?: any): void;
    private addLog;
    getLogs(limit?: number): LogEntry[];
    getLogsByLevel(level: 'info' | 'warn' | 'error'): LogEntry[];
    getLogsBySource(source: string): LogEntry[];
    clearLogs(): void;
    exportLogs(): string;
    getLogStats(): {
        sources: string[];
        total: number;
        info: number;
        warn: number;
        error: number;
    };
}
//# sourceMappingURL=dataLogger.d.ts.map
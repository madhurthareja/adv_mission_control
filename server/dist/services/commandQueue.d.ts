import { CommandPacket } from '../types';
export declare class CommandQueue {
    private queue;
    private processing;
    private maxQueueSize;
    addCommand(command: CommandPacket): void;
    private findInsertIndex;
    private processQueue;
    private executeCommand;
    getQueueSize(): number;
    clearQueue(): void;
    getQueueStatus(): {
        size: number;
        processing: boolean;
        commands: {
            id: string;
            type: "control" | "system" | "video";
            priority: "high" | "medium" | "low";
            timestamp: number;
        }[];
    };
}
//# sourceMappingURL=commandQueue.d.ts.map
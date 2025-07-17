export interface ScheduleConfig {
    full: string;
    incremental: string;
    images: string;
    validation: string;
}
export interface SchedulerOptions {
    enabled: boolean;
    config: ScheduleConfig;
    timezone?: string;
}
declare class SyncScheduler {
    private tasks;
    private isRunning;
    private config;
    private timezone;
    constructor(options: SchedulerOptions);
    /**
     * 设置定时任务
     */
    private setupSchedules;
    /**
     * 启动调度器
     */
    start(): void;
    /**
     * 停止调度器
     */
    stop(): void;
    /**
     * 销毁调度器
     */
    destroy(): void;
    /**
     * 获取调度器状态
     */
    getStatus(): {
        isRunning: boolean;
        timezone: string;
        tasks: {
            name: string;
            running: boolean;
            schedule: string;
        }[];
        lastCheck: string;
    };
    /**
     * 更新调度配置
     */
    updateConfig(newConfig: Partial<ScheduleConfig>): void;
    /**
     * 手动触发同步任务
     */
    triggerSync(type: 'full' | 'incremental' | 'images' | 'validation'): Promise<import("./syncService").SyncResult | {
        success: boolean;
        message: string;
    }>;
    /**
     * 执行数据验证
     */
    private performDataValidation;
    /**
     * 获取任务的调度配置
     */
    private getScheduleForTask;
    /**
     * 发送错误通知
     */
    private notifyError;
}
declare const defaultScheduleConfig: ScheduleConfig;
export declare const syncScheduler: SyncScheduler;
export { SyncScheduler, defaultScheduleConfig };
//# sourceMappingURL=syncScheduler.d.ts.map
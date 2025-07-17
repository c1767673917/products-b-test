"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultScheduleConfig = exports.SyncScheduler = exports.syncScheduler = void 0;
const cron = __importStar(require("node-cron"));
const syncService_1 = require("./syncService");
class SyncScheduler {
    constructor(options) {
        this.tasks = new Map();
        this.isRunning = false;
        this.config = options.config;
        this.timezone = options.timezone || 'Asia/Shanghai';
        if (options.enabled) {
            this.setupSchedules();
        }
    }
    /**
     * 设置定时任务
     */
    setupSchedules() {
        if (this.isRunning) {
            console.warn('调度器已在运行中');
            return;
        }
        console.log('设置数据同步定时任务...');
        // 增量同步任务 - 每30分钟
        const incrementalTask = cron.schedule(this.config.incremental, async () => {
            try {
                console.log('执行定时增量同步...');
                const result = await syncService_1.syncService.syncProducts({ mode: 'incremental' });
                console.log('增量同步完成:', result.message);
                if (!result.success) {
                    await this.notifyError('incremental_sync_failed', result.message);
                }
            }
            catch (error) {
                console.error('增量同步失败:', error);
                await this.notifyError('incremental_sync_failed', error);
            }
        }, {
            timezone: this.timezone
        });
        // 全量同步任务 - 每天凌晨2点
        const fullTask = cron.schedule(this.config.full, async () => {
            try {
                console.log('执行定时全量同步...');
                const result = await syncService_1.syncService.syncProducts({ mode: 'full' });
                console.log('全量同步完成:', result.message);
                if (!result.success) {
                    await this.notifyError('full_sync_failed', result.message);
                }
            }
            catch (error) {
                console.error('全量同步失败:', error);
                await this.notifyError('full_sync_failed', error);
            }
        }, {
            timezone: this.timezone
        });
        // 图片同步任务 - 每天凌晨3点
        const imageTask = cron.schedule(this.config.images, async () => {
            try {
                console.log('执行定时图片同步...');
                const result = await syncService_1.syncService.syncImages();
                console.log('图片同步完成:', result.message);
                if (!result.success) {
                    await this.notifyError('image_sync_failed', result.message);
                }
            }
            catch (error) {
                console.error('图片同步失败:', error);
                await this.notifyError('image_sync_failed', error);
            }
        }, {
            timezone: this.timezone
        });
        // 数据验证任务 - 每天凌晨4点
        const validationTask = cron.schedule(this.config.validation, async () => {
            try {
                console.log('执行定时数据验证...');
                await this.performDataValidation();
            }
            catch (error) {
                console.error('数据验证失败:', error);
                await this.notifyError('validation_failed', error);
            }
        }, {
            timezone: this.timezone
        });
        // 保存任务引用
        this.tasks.set('incremental', incrementalTask);
        this.tasks.set('full', fullTask);
        this.tasks.set('images', imageTask);
        this.tasks.set('validation', validationTask);
        this.isRunning = true;
        console.log('定时任务设置完成');
    }
    /**
     * 启动调度器
     */
    start() {
        if (!this.isRunning) {
            this.setupSchedules();
        }
        for (const [name, task] of this.tasks) {
            task.start();
            console.log(`启动定时任务: ${name}`);
        }
        console.log('同步调度器已启动');
    }
    /**
     * 停止调度器
     */
    stop() {
        for (const [name, task] of this.tasks) {
            task.stop();
            console.log(`停止定时任务: ${name}`);
        }
        console.log('同步调度器已停止');
    }
    /**
     * 销毁调度器
     */
    destroy() {
        this.stop();
        for (const [name, task] of this.tasks) {
            task.destroy();
            console.log(`销毁定时任务: ${name}`);
        }
        this.tasks.clear();
        this.isRunning = false;
        console.log('同步调度器已销毁');
    }
    /**
     * 获取调度器状态
     */
    getStatus() {
        const taskStatus = Array.from(this.tasks.entries()).map(([name, task]) => ({
            name,
            running: task.getStatus() === 'scheduled',
            schedule: this.getScheduleForTask(name)
        }));
        return {
            isRunning: this.isRunning,
            timezone: this.timezone,
            tasks: taskStatus,
            lastCheck: new Date().toISOString()
        };
    }
    /**
     * 更新调度配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // 重启调度器以应用新配置
        if (this.isRunning) {
            this.stop();
            this.destroy();
            this.setupSchedules();
            this.start();
            console.log('调度器配置已更新并重启');
        }
    }
    /**
     * 手动触发同步任务
     */
    async triggerSync(type) {
        try {
            console.log(`手动触发${type}同步...`);
            switch (type) {
                case 'full':
                    return await syncService_1.syncService.syncProducts({ mode: 'full' });
                case 'incremental':
                    return await syncService_1.syncService.syncProducts({ mode: 'incremental' });
                case 'images':
                    return await syncService_1.syncService.syncImages();
                case 'validation':
                    await this.performDataValidation();
                    return { success: true, message: '数据验证完成' };
                default:
                    throw new Error(`不支持的同步类型: ${type}`);
            }
        }
        catch (error) {
            console.error(`手动触发${type}同步失败:`, error);
            throw error;
        }
    }
    /**
     * 执行数据验证
     */
    async performDataValidation() {
        console.log('开始执行数据验证...');
        // 这里可以集成数据一致性检查逻辑
        // 例如检查产品数据完整性、图片文件存在性等
        // 简单示例：检查产品数量
        const { Product } = require('../models');
        const totalProducts = await Product.countDocuments({ status: 'active' });
        const productsWithImages = await Product.countDocuments({
            status: 'active',
            'images.front': { $exists: true, $ne: '' }
        });
        const imageRate = totalProducts > 0 ? (productsWithImages / totalProducts * 100).toFixed(2) : '0';
        console.log(`数据验证结果: 总产品数 ${totalProducts}, 有图片产品数 ${productsWithImages}, 图片覆盖率 ${imageRate}%`);
        // 如果覆盖率过低，发送告警
        if (parseFloat(imageRate) < 95) {
            await this.notifyError('low_image_coverage', `图片覆盖率较低: ${imageRate}%`);
        }
    }
    /**
     * 获取任务的调度配置
     */
    getScheduleForTask(taskName) {
        switch (taskName) {
            case 'incremental':
                return this.config.incremental;
            case 'full':
                return this.config.full;
            case 'images':
                return this.config.images;
            case 'validation':
                return this.config.validation;
            default:
                return '';
        }
    }
    /**
     * 发送错误通知
     */
    async notifyError(type, error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const notification = {
            type,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            severity: 'high'
        };
        // 这里可以集成多种通知方式：
        // 1. 邮件通知
        // 2. 钉钉/企业微信机器人
        // 3. 短信通知
        // 4. Slack/Discord通知
        console.error(`🚨 同步错误通知:`, notification);
        // TODO: 实现具体的通知发送逻辑
        // 例如：await emailService.sendAlert(notification);
        // 例如：await webhookService.sendToDingTalk(notification);
    }
}
exports.SyncScheduler = SyncScheduler;
// 默认调度配置
const defaultScheduleConfig = {
    full: '0 2 * * *', // 每天凌晨2点全量同步
    incremental: '*/30 * * * *', // 每30分钟增量同步
    images: '0 3 * * *', // 每天凌晨3点图片同步
    validation: '0 4 * * *' // 每天凌晨4点数据验证
};
exports.defaultScheduleConfig = defaultScheduleConfig;
// 创建调度器实例
exports.syncScheduler = new SyncScheduler({
    enabled: process.env.SYNC_SCHEDULER_ENABLED === 'true',
    config: defaultScheduleConfig,
    timezone: process.env.TIMEZONE || 'Asia/Shanghai'
});
//# sourceMappingURL=syncScheduler.js.map
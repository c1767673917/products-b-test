export interface SyncResult {
    success: boolean;
    message: string;
    details: {
        created: number;
        updated: number;
        deleted: number;
        errors: Array<{
            productId?: string;
            error: string;
        }>;
        duration: number;
    };
}
export interface SyncOptions {
    mode: 'full' | 'incremental' | 'selective';
    forceUpdate?: boolean;
    dryRun?: boolean;
    productIds?: string[];
}
export interface ChangeSet {
    creates: any[];
    updates: Array<{
        productId: string;
        changes: any;
        newData: any;
    }>;
    deletes: any[];
    imageChanges: Array<{
        productId: string;
        type: 'add' | 'update' | 'delete';
        imagePath: string;
    }>;
}
declare class SyncService {
    private syncStatus;
    private lastSyncTime;
    private syncHistory;
    /**
     * 执行产品数据同步
     */
    syncProducts(options?: SyncOptions): Promise<SyncResult>;
    /**
     * 全量同步 - 从JSON文件同步所有产品数据
     */
    private performFullSync;
    /**
     * 增量同步 - 基于时间戳同步变更的数据
     */
    private performIncrementalSync;
    /**
     * 选择性同步 - 同步指定的产品
     */
    private performSelectiveSync;
    /**
     * 同步图片文件
     */
    syncImages(imageChanges?: Array<any>): Promise<SyncResult>;
    /**
     * 获取同步状态
     */
    getSyncStatus(): {
        status: "error" | "idle" | "running";
        lastSyncTime: Date | null;
        syncHistory: {
            timestamp: Date;
            result: SyncResult;
        }[];
    };
    /**
     * 检测数据变更
     */
    private detectChanges;
    /**
     * 比较产品数据是否有变更
     */
    private compareProducts;
    /**
     * 转换产品数据格式
     */
    private transformProductData;
    /**
     * 构建搜索文本
     */
    private buildSearchText;
    /**
     * 加载JSON数据源
     */
    private loadJSONData;
    /**
     * 创建图片记录
     */
    private createImageRecord;
    /**
     * 清除相关缓存
     */
    private clearCaches;
}
export declare const syncService: SyncService;
export {};
//# sourceMappingURL=syncService.d.ts.map
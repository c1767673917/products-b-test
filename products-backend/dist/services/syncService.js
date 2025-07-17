"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Product_1 = require("../models/Product");
const Image_1 = require("../models/Image");
const imageConfig_1 = require("../config/imageConfig");
const mongoose_1 = __importDefault(require("mongoose"));
class SyncService {
    constructor() {
        this.syncStatus = 'idle';
        this.lastSyncTime = null;
        this.syncHistory = [];
    }
    /**
     * 执行产品数据同步
     */
    async syncProducts(options = { mode: 'incremental' }) {
        const startTime = Date.now();
        try {
            if (this.syncStatus === 'running') {
                throw new Error('同步任务正在进行中，请稍后再试');
            }
            this.syncStatus = 'running';
            console.log(`开始执行${options.mode}同步...`);
            let result;
            switch (options.mode) {
                case 'full':
                    result = await this.performFullSync(options);
                    break;
                case 'incremental':
                    result = await this.performIncrementalSync(options);
                    break;
                case 'selective':
                    result = await this.performSelectiveSync(options);
                    break;
                default:
                    throw new Error(`不支持的同步模式: ${options.mode}`);
            }
            // 记录同步历史
            this.lastSyncTime = new Date();
            this.syncHistory.push({
                timestamp: this.lastSyncTime,
                result
            });
            // 保留最近50次同步记录
            if (this.syncHistory.length > 50) {
                this.syncHistory = this.syncHistory.slice(-50);
            }
            return result;
        }
        catch (error) {
            this.syncStatus = 'error';
            const errorResult = {
                success: false,
                message: error instanceof Error ? error.message : '同步失败',
                details: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    errors: [{ error: error instanceof Error ? error.message : '未知错误' }],
                    duration: Date.now() - startTime
                }
            };
            console.error('同步失败:', error);
            return errorResult;
        }
        finally {
            this.syncStatus = 'idle';
        }
    }
    /**
     * 全量同步 - 从JSON文件同步所有产品数据
     */
    async performFullSync(options) {
        const startTime = Date.now();
        let created = 0, updated = 0, deleted = 0;
        const errors = [];
        try {
            // 读取JSON数据源
            const jsonData = await this.loadJSONData();
            console.log(`加载到 ${jsonData.length} 个产品数据`);
            if (options.dryRun) {
                console.log('[DRY RUN] 仅预览操作，不执行实际更新');
            }
            // 获取现有产品数据
            const existingProducts = await Product_1.Product.find({}).lean();
            const existingMap = new Map(existingProducts.map(p => [p.productId, p]));
            // 检测变更
            const changes = await this.detectChanges(jsonData, existingProducts);
            console.log(`检测到变更: 新增${changes.creates.length}, 更新${changes.updates.length}, 删除${changes.deletes.length}`);
            if (!options.dryRun) {
                // 使用事务处理
                const session = await mongoose_1.default.startSession();
                try {
                    await session.withTransaction(async () => {
                        // 处理新增
                        for (const product of changes.creates) {
                            try {
                                const transformedProduct = this.transformProductData(product);
                                await Product_1.Product.create([transformedProduct], { session });
                                created++;
                                console.log(`创建产品: ${product.id}`);
                            }
                            catch (error) {
                                errors.push({
                                    productId: product.id,
                                    error: `创建失败: ${error instanceof Error ? error.message : '未知错误'}`
                                });
                            }
                        }
                        // 处理更新
                        for (const update of changes.updates) {
                            try {
                                const transformedProduct = this.transformProductData(update.newData);
                                await Product_1.Product.findOneAndUpdate({ productId: update.productId }, { ...transformedProduct, updatedAt: new Date() }, { session, new: true });
                                updated++;
                                console.log(`更新产品: ${update.productId}`);
                            }
                            catch (error) {
                                errors.push({
                                    productId: update.productId,
                                    error: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`
                                });
                            }
                        }
                        // 处理删除（软删除）
                        for (const product of changes.deletes) {
                            try {
                                await Product_1.Product.findOneAndUpdate({ productId: product.productId }, {
                                    status: 'deleted',
                                    isVisible: false,
                                    updatedAt: new Date()
                                }, { session });
                                deleted++;
                                console.log(`删除产品: ${product.productId}`);
                            }
                            catch (error) {
                                errors.push({
                                    productId: product.productId,
                                    error: `删除失败: ${error instanceof Error ? error.message : '未知错误'}`
                                });
                            }
                        }
                    });
                }
                finally {
                    await session.endSession();
                }
                // 处理图片同步
                if (changes.imageChanges.length > 0) {
                    console.log(`处理 ${changes.imageChanges.length} 个图片变更`);
                    await this.syncImages(changes.imageChanges);
                }
                // 清除相关缓存
                await this.clearCaches();
            }
            return {
                success: true,
                message: options.dryRun ?
                    `[预览] 将会创建${created}个，更新${updated}个，删除${deleted}个产品` :
                    `全量同步完成: 创建${created}个，更新${updated}个，删除${deleted}个产品`,
                details: {
                    created,
                    updated,
                    deleted,
                    errors,
                    duration: Date.now() - startTime
                }
            };
        }
        catch (error) {
            throw new Error(`全量同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 增量同步 - 基于时间戳同步变更的数据
     */
    async performIncrementalSync(options) {
        const startTime = Date.now();
        let created = 0, updated = 0;
        const errors = [];
        try {
            // 获取上次同步时间
            const lastSync = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
            console.log(`增量同步: 检查 ${lastSync.toISOString()} 之后的变更`);
            // 读取JSON数据源
            const jsonData = await this.loadJSONData();
            // 筛选需要同步的数据（基于collectTime或其他时间字段）
            const recentData = jsonData.filter(product => {
                const collectTime = new Date(product.collectTime);
                return collectTime > lastSync;
            });
            console.log(`发现 ${recentData.length} 个最近更新的产品`);
            if (recentData.length === 0) {
                return {
                    success: true,
                    message: '没有发现需要同步的新数据',
                    details: {
                        created: 0,
                        updated: 0,
                        deleted: 0,
                        errors: [],
                        duration: Date.now() - startTime
                    }
                };
            }
            if (!options.dryRun) {
                // 处理每个产品
                for (const product of recentData) {
                    try {
                        const existing = await Product_1.Product.findOne({ productId: product.id });
                        const transformedProduct = this.transformProductData(product);
                        if (existing) {
                            // 更新现有产品
                            await Product_1.Product.findOneAndUpdate({ productId: product.id }, { ...transformedProduct, updatedAt: new Date() }, { new: true });
                            updated++;
                            console.log(`增量更新产品: ${product.id}`);
                        }
                        else {
                            // 创建新产品
                            await Product_1.Product.create(transformedProduct);
                            created++;
                            console.log(`增量创建产品: ${product.id}`);
                        }
                    }
                    catch (error) {
                        errors.push({
                            productId: product.id,
                            error: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`
                        });
                    }
                }
                // 清除相关缓存
                await this.clearCaches();
            }
            return {
                success: true,
                message: options.dryRun ?
                    `[预览] 将会创建${created}个，更新${updated}个产品` :
                    `增量同步完成: 创建${created}个，更新${updated}个产品`,
                details: {
                    created,
                    updated,
                    deleted: 0,
                    errors,
                    duration: Date.now() - startTime
                }
            };
        }
        catch (error) {
            throw new Error(`增量同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 选择性同步 - 同步指定的产品
     */
    async performSelectiveSync(options) {
        const startTime = Date.now();
        let created = 0, updated = 0;
        const errors = [];
        try {
            if (!options.productIds || options.productIds.length === 0) {
                throw new Error('选择性同步需要指定产品ID列表');
            }
            console.log(`选择性同步: ${options.productIds.length} 个产品`);
            // 读取JSON数据源
            const jsonData = await this.loadJSONData();
            // 筛选指定的产品
            const targetProducts = jsonData.filter(product => options.productIds.includes(product.id));
            console.log(`找到 ${targetProducts.length} 个匹配的产品数据`);
            if (!options.dryRun) {
                // 处理每个产品
                for (const product of targetProducts) {
                    try {
                        const existing = await Product_1.Product.findOne({ productId: product.id });
                        const transformedProduct = this.transformProductData(product);
                        if (existing) {
                            // 更新现有产品
                            await Product_1.Product.findOneAndUpdate({ productId: product.id }, { ...transformedProduct, updatedAt: new Date() }, { new: true });
                            updated++;
                            console.log(`选择性更新产品: ${product.id}`);
                        }
                        else {
                            // 创建新产品
                            await Product_1.Product.create(transformedProduct);
                            created++;
                            console.log(`选择性创建产品: ${product.id}`);
                        }
                    }
                    catch (error) {
                        errors.push({
                            productId: product.id,
                            error: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`
                        });
                    }
                }
                // 清除相关缓存
                await this.clearCaches();
            }
            return {
                success: true,
                message: options.dryRun ?
                    `[预览] 将会创建${created}个，更新${updated}个产品` :
                    `选择性同步完成: 创建${created}个，更新${updated}个产品`,
                details: {
                    created,
                    updated,
                    deleted: 0,
                    errors,
                    duration: Date.now() - startTime
                }
            };
        }
        catch (error) {
            throw new Error(`选择性同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 同步图片文件
     */
    async syncImages(imageChanges) {
        const startTime = Date.now();
        let created = 0, updated = 0;
        const errors = [];
        try {
            console.log('开始同步图片文件...');
            // 如果没有指定图片变更，则扫描所有产品的图片
            if (!imageChanges) {
                const products = await Product_1.Product.find({ status: 'active' }).lean();
                for (const product of products) {
                    try {
                        // 检查产品图片是否存在于MinIO
                        const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
                        for (const type of imageTypes) {
                            const imagePath = product.images?.[type];
                            if (imagePath) {
                                // 检查图片是否已在数据库中
                                const existingImage = await Image_1.Image.findOne({
                                    productId: product.productId,
                                    type: type
                                });
                                if (!existingImage) {
                                    // 如果图片文件存在但数据库中没有记录，创建记录
                                    // TODO: 可以通过检查MinIO中的文件存在性来验证
                                    await this.createImageRecord(product.productId, type, imagePath);
                                    created++;
                                }
                            }
                        }
                    }
                    catch (error) {
                        errors.push({
                            productId: product.productId,
                            error: `图片同步失败: ${error instanceof Error ? error.message : '未知错误'}`
                        });
                    }
                }
            }
            return {
                success: true,
                message: `图片同步完成: 创建${created}个图片记录`,
                details: {
                    created,
                    updated,
                    deleted: 0,
                    errors,
                    duration: Date.now() - startTime
                }
            };
        }
        catch (error) {
            throw new Error(`图片同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            status: this.syncStatus,
            lastSyncTime: this.lastSyncTime,
            syncHistory: this.syncHistory.slice(-10) // 返回最近10次记录
        };
    }
    /**
     * 检测数据变更
     */
    async detectChanges(jsonData, existingData) {
        const changes = {
            creates: [],
            updates: [],
            deletes: [],
            imageChanges: []
        };
        // 创建现有数据的映射
        const existingMap = new Map(existingData.map(p => [p.productId, p]));
        // 检测新增和更新
        for (const jsonProduct of jsonData) {
            const existing = existingMap.get(jsonProduct.id);
            if (!existing) {
                changes.creates.push(jsonProduct);
            }
            else {
                const hasChanges = this.compareProducts(jsonProduct, existing);
                if (hasChanges) {
                    changes.updates.push({
                        productId: jsonProduct.id,
                        changes: {},
                        newData: jsonProduct
                    });
                }
            }
            existingMap.delete(jsonProduct.id);
        }
        // 检测删除（剩余的就是要删除的）
        changes.deletes = Array.from(existingMap.values());
        return changes;
    }
    /**
     * 比较产品数据是否有变更
     */
    compareProducts(jsonProduct, existingProduct) {
        // 比较关键字段
        const jsonTime = new Date(jsonProduct.collectTime).getTime();
        const existingTime = new Date(existingProduct.collectTime).getTime();
        return jsonTime > existingTime ||
            jsonProduct.name !== existingProduct.name ||
            jsonProduct.price?.normal !== existingProduct.price?.normal ||
            jsonProduct.category?.primary !== existingProduct.category?.primary;
    }
    /**
     * 转换产品数据格式
     */
    transformProductData(jsonProduct) {
        return {
            productId: jsonProduct.id,
            recordId: jsonProduct.recordId || jsonProduct.id,
            name: jsonProduct.name || '',
            sequence: jsonProduct.sequence || '',
            category: {
                primary: jsonProduct.category?.primary || '未分类',
                secondary: jsonProduct.category?.secondary || ''
            },
            price: {
                normal: parseFloat(jsonProduct.price?.normal) || 0,
                discount: parseFloat(jsonProduct.price?.discount) || 0,
                discountRate: parseFloat(jsonProduct.price?.discountRate) || 0,
                currency: 'CNY'
            },
            images: {
                front: jsonProduct.images?.front || '',
                back: jsonProduct.images?.back || '',
                label: jsonProduct.images?.label || '',
                package: jsonProduct.images?.package || '',
                gift: jsonProduct.images?.gift || ''
            },
            origin: {
                country: jsonProduct.origin?.country || '中国',
                province: jsonProduct.origin?.province || '',
                city: jsonProduct.origin?.city || ''
            },
            platform: jsonProduct.platform || '',
            specification: jsonProduct.specification || '',
            flavor: jsonProduct.flavor || '',
            manufacturer: jsonProduct.manufacturer || '',
            collectTime: new Date(jsonProduct.collectTime),
            createdAt: new Date(),
            updatedAt: new Date(),
            searchText: this.buildSearchText(jsonProduct),
            status: 'active',
            isVisible: true
        };
    }
    /**
     * 构建搜索文本
     */
    buildSearchText(product) {
        const searchFields = [
            product.name,
            product.category?.primary,
            product.category?.secondary,
            product.platform,
            product.manufacturer,
            product.flavor,
            product.specification
        ];
        return searchFields
            .filter(field => field && field.trim())
            .join(' ')
            .toLowerCase();
    }
    /**
     * 加载JSON数据源
     */
    async loadJSONData() {
        try {
            // 查找产品数据文件
            const dataPath = path_1.default.join(__dirname, '../../../product-showcase/src/data/products.json');
            if (!fs_1.default.existsSync(dataPath)) {
                throw new Error(`数据文件不存在: ${dataPath}`);
            }
            const fileContent = await fs_1.default.promises.readFile(dataPath, 'utf-8');
            const data = JSON.parse(fileContent);
            if (!Array.isArray(data)) {
                throw new Error('数据文件格式错误，应该是产品数组');
            }
            console.log(`加载JSON数据成功: ${data.length} 个产品`);
            return data;
        }
        catch (error) {
            throw new Error(`加载JSON数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 创建图片记录
     */
    async createImageRecord(productId, type, imagePath) {
        try {
            const imageId = `${productId}_${type}_${Date.now()}`;
            // 处理图片路径，确保使用统一格式
            let processedPath = imagePath;
            // 如果是完整URL，提取对象名
            if (imagePath.includes('http')) {
                processedPath = imageConfig_1.ImagePathUtils.extractObjectName(imagePath);
            }
            // 如果是废弃路径，转换为新路径
            if (imageConfig_1.ImagePathUtils.isDeprecatedPath(processedPath)) {
                processedPath = imageConfig_1.ImagePathUtils.convertDeprecatedPath(processedPath);
            }
            // 构建完整的公开访问URL
            const publicUrl = imageConfig_1.ImagePathUtils.buildPublicUrl(processedPath);
            await Image_1.Image.create({
                imageId,
                productId,
                type,
                bucketName: imageConfig_1.IMAGE_CONFIG.MINIO.BUCKET_NAME,
                objectName: processedPath,
                originalName: path_1.default.basename(processedPath),
                publicUrl,
                processStatus: 'completed',
                uploadedAt: new Date(),
                lastAccessedAt: new Date(),
                accessCount: 0,
                isActive: true,
                isPublic: true
            });
            console.log(`创建图片记录: ${imageId} -> ${processedPath}`);
        }
        catch (error) {
            console.error(`创建图片记录失败: ${error}`);
        }
    }
    /**
     * 清除相关缓存
     */
    async clearCaches() {
        try {
            // 这里可以集成Redis缓存清理逻辑
            console.log('清除同步相关缓存...');
            // TODO: 实现Redis缓存清理
        }
        catch (error) {
            console.warn('清除缓存时出错:', error);
        }
    }
}
exports.syncService = new SyncService();
//# sourceMappingURL=syncService.js.map
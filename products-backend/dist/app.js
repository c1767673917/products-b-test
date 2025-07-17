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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
// 加载环境变量
(0, dotenv_1.config)();
const app = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || 'info'
    }
});
// 注册插件
app.register(cors_1.default, {
    origin: true,
    credentials: true
});
app.register(multipart_1.default);
app.register(rate_limit_1.default, {
    max: 100,
    timeWindow: '1 minute'
});
// 数据库连接
async function connectDatabase() {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        app.log.info('MongoDB 连接成功');
    }
    catch (error) {
        app.log.error('MongoDB 连接失败:', error);
        process.exit(1);
    }
}
// 健康检查
app.get('/health', async (request, reply) => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
    };
});
// API 路由前缀
app.register(async function (fastify) {
    // 注册产品相关路由
    const { productRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/products')));
    await fastify.register(productRoutes);
    // 注册搜索相关路由
    const { searchRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/search')));
    await fastify.register(searchRoutes);
    // 注册分类和统计路由
    const { categoryRoutes, statsRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/categories')));
    await fastify.register(categoryRoutes);
    await fastify.register(statsRoutes);
    // 注册图片相关路由
    const { imageRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/images')));
    await fastify.register(imageRoutes, { prefix: '/images' });
    // 注册数据同步路由
    const { syncRoutes } = await Promise.resolve().then(() => __importStar(require('./routes/sync')));
    await fastify.register(syncRoutes);
}, { prefix: '/api/v1' });
// 启动服务器
async function start() {
    try {
        await connectDatabase();
        const port = parseInt(process.env.PORT || '3000');
        const host = '0.0.0.0';
        await app.listen({ port, host });
        app.log.info(`服务器启动成功，监听端口: ${port}`);
    }
    catch (error) {
        app.log.error('服务器启动失败:', error);
        console.error('详细错误信息:', error);
        process.exit(1);
    }
}
// 优雅关闭
process.on('SIGINT', async () => {
    app.log.info('收到 SIGINT 信号，开始优雅关闭...');
    try {
        await mongoose_1.default.connection.close();
        await app.close();
        app.log.info('服务器已优雅关闭');
        process.exit(0);
    }
    catch (error) {
        app.log.error('关闭过程中出错:', error);
        process.exit(1);
    }
});
if (require.main === module) {
    start();
}
exports.default = app;
//# sourceMappingURL=app.js.map
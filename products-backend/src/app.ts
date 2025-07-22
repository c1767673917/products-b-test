import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { webSocketService } from './services/webSocketService';

// 加载环境变量
config();

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// 注册插件
app.register(cors, {
  origin: true,
  credentials: true
});

app.register(multipart);

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Phase 3: Register WebSocket support (temporarily disabled for testing)
// app.register(websocket);

// 数据库连接
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      // 禁用事务相关功能
      retryWrites: false,
      w: 1,
      // 其他连接选项
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    app.log.info('MongoDB 连接成功');
  } catch (error) {
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
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  };
});

// API 路由前缀
app.register(async function(fastify) {
  // Phase 3: 注册WebSocket路由 (temporarily disabled)
  // await webSocketService.registerRoutes(fastify);
  
  // 注册产品相关路由
  const { productRoutes } = await import('./routes/products');
  await fastify.register(productRoutes);
  
  // 注册搜索相关路由
  const { searchRoutes } = await import('./routes/search');
  await fastify.register(searchRoutes);
  
  // 注册分类和统计路由
  const { categoryRoutes, statsRoutes } = await import('./routes/categories');
  await fastify.register(categoryRoutes);
  await fastify.register(statsRoutes);
  
  // 注册图片相关路由
  const { imageRoutes } = await import('./routes/images');
  await fastify.register(imageRoutes, { prefix: '/images' });
  
  // 注册数据同步路由 (增强版)
  const { syncRoutes } = await import('./routes/sync');
  await fastify.register(syncRoutes);
  
  // Phase 3: 注册配置管理路由
  const { configRoutes } = await import('./routes/config');
  await fastify.register(configRoutes);
  
  // Phase 3: 注册健康检查路由
  const { healthRoutes } = await import('./routes/health');
  await fastify.register(healthRoutes);
}, { prefix: '/api/v1' });

// 启动服务器
async function start() {
  try {
    await connectDatabase();
    const port = parseInt(process.env.PORT || '3000');
    const host = '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`服务器启动成功，监听端口: ${port}`);
  } catch (error) {
    app.log.error('服务器启动失败:', error);
    console.error('详细错误信息:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  app.log.info('收到 SIGINT 信号，开始优雅关闭...');
  try {
    await mongoose.connection.close();
    await app.close();
    app.log.info('服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    app.log.error('关闭过程中出错:', error);
    process.exit(1);
  }
});

if (require.main === module) {
  start();
}

export default app;
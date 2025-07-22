const fastify = require('fastify')({ logger: true });
require('dotenv').config();

// 注册CORS
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

// 健康检查
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Test server is running'
  };
});

// 测试API
fastify.get('/api/test', async (request, reply) => {
  return {
    message: 'API is working',
    timestamp: new Date().toISOString()
  };
});

// 产品列表API（简化版）
fastify.get('/api/products', async (request, reply) => {
  return {
    products: [
      {
        id: 'test-001',
        name: '测试产品1',
        price: 99.99,
        category: '测试分类'
      },
      {
        id: 'test-002', 
        name: '测试产品2',
        price: 199.99,
        category: '测试分类'
      }
    ],
    total: 2,
    message: 'Test data - real MongoDB connection needed for actual data'
  };
});

// 启动服务器
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`🚀 Test server running on http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
    console.log(`🧪 Test API: http://localhost:${port}/api/test`);
    console.log(`📦 Products API: http://localhost:${port}/api/products`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
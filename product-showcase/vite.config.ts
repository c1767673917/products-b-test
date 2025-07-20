import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // 代码分割配置
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库分离到单独的chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 将UI库分离
          'ui-vendor': ['framer-motion', '@headlessui/react', '@heroicons/react'],
          // 将状态管理和查询库分离
          'state-vendor': ['zustand', '@tanstack/react-query'],
          // 将工具库分离
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // 启用源码映射（生产环境可选）
    sourcemap: process.env.NODE_ENV === 'development',
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除console.log（生产环境）
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    } as any,
  },
  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
    cors: true,
  },
  // 预览服务器配置
  preview: {
    port: 4173,
    open: true,
  },
  // 优化配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      '@headlessui/react',
      '@heroicons/react/24/outline',
      'zustand',
      '@tanstack/react-query',
    ],
  },
})

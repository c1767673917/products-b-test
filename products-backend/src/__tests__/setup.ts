// Jest setup file
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.FEISHU_APP_ID = 'test_app_id';
process.env.FEISHU_APP_SECRET = 'test_app_secret';
process.env.FEISHU_APP_TOKEN = 'test_app_token';
process.env.FEISHU_TABLE_ID = 'test_table_id';

// Mock console to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for async tests
jest.setTimeout(30000);
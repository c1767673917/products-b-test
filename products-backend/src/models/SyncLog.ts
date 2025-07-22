import mongoose from 'mongoose';

// SyncLog Schema - 同步日志模型
const SyncLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  syncType: {
    type: String,
    enum: ['full', 'incremental', 'selective'],
    required: true,
    index: true
  },
  
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  
  endTime: {
    type: Date,
    index: true
  },
  
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled', 'paused'],
    required: true,
    index: true
  },
  
  stats: {
    totalRecords: { type: Number, default: 0 },
    createdRecords: { type: Number, default: 0 },
    updatedRecords: { type: Number, default: 0 },
    deletedRecords: { type: Number, default: 0 },
    processedImages: { type: Number, default: 0 },
    failedImages: { type: Number, default: 0 }
  },
  
  errorLogs: [{
    type: { type: String, required: true },
    message: { type: String, required: true },
    productId: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  config: {
    feishuAppToken: { type: String, required: true },
    feishuTableId: { type: String, required: true },
    syncOptions: { type: mongoose.Schema.Types.Mixed }
  },
  
  progress: {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    currentOperation: { type: String }
  }
}, {
  timestamps: true,
  versionKey: false
});

// 索引
SyncLogSchema.index({ syncType: 1, status: 1 });
SyncLogSchema.index({ startTime: -1 });
SyncLogSchema.index({ status: 1, startTime: -1 });

export const SyncLog = mongoose.model('SyncLog', SyncLogSchema);
export default SyncLog;
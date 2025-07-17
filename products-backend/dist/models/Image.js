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
exports.Image = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ImageSchema = new mongoose_1.Schema({
    imageId: { type: String, required: true, unique: true, index: true },
    productId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['front', 'back', 'label', 'package', 'gift'] },
    // MinIO存储信息
    bucketName: { type: String, required: true },
    objectName: { type: String, required: true },
    originalName: { type: String, required: true },
    // 文件信息
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    width: Number,
    height: Number,
    // 访问信息
    publicUrl: { type: String, required: true },
    cdnUrl: String,
    // 处理状态
    processStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'completed'
    },
    thumbnails: [{
            size: { type: String, required: true },
            url: { type: String, required: true },
            width: { type: Number, required: true },
            height: { type: Number, required: true }
        }],
    // 元数据
    uploadedAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
    accessCount: { type: Number, default: 0 },
    // 哈希值用于去重
    md5Hash: { type: String, required: true, index: true },
    sha256Hash: String,
    // 状态
    isActive: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: true }
}, {
    timestamps: true
});
// 复合索引
ImageSchema.index({ productId: 1, type: 1 });
ImageSchema.index({ bucketName: 1, objectName: 1 });
ImageSchema.index({ isActive: 1, isPublic: 1 });
exports.Image = mongoose_1.default.model('Image', ImageSchema);
//# sourceMappingURL=Image.js.map
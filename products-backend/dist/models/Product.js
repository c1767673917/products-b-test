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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProductSchema = new mongoose_1.Schema({
    productId: { type: String, required: true, unique: true, index: true },
    recordId: { type: String, required: true },
    name: { type: String, required: true, index: true },
    sequence: { type: String, required: true },
    category: {
        primary: { type: String, required: true, index: true },
        secondary: { type: String, required: true }
    },
    price: {
        normal: { type: Number, required: true, index: true },
        discount: { type: Number, default: 0 },
        discountRate: { type: Number, default: 0 },
        currency: { type: String, default: 'CNY' }
    },
    images: {
        front: String,
        back: String,
        label: String,
        package: String,
        gift: String
    },
    origin: {
        country: { type: String, default: '中国' },
        province: { type: String, index: true },
        city: String
    },
    platform: { type: String, required: true, index: true },
    specification: String,
    flavor: String,
    manufacturer: String,
    collectTime: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    searchText: { type: String, index: 'text' },
    status: { type: String, default: 'active', index: true },
    isVisible: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});
// 复合索引
ProductSchema.index({ status: 1, isVisible: 1, 'category.primary': 1, collectTime: -1 });
ProductSchema.index({ platform: 1, 'origin.province': 1 });
ProductSchema.index({ 'price.normal': 1, 'category.primary': 1 });
// 全文搜索索引
ProductSchema.index({
    name: 'text',
    searchText: 'text',
    manufacturer: 'text'
}, {
    weights: {
        name: 10,
        searchText: 5,
        manufacturer: 1
    }
});
exports.Product = mongoose_1.default.model('Product', ProductSchema);
//# sourceMappingURL=Product.js.map
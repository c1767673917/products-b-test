"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = syncRoutes;
const syncController_1 = require("../controllers/syncController");
async function syncRoutes(fastify) {
    // 同步产品数据
    fastify.post('/sync/products', {
        schema: {
            description: '同步产品数据',
            tags: ['sync'],
            body: {
                type: 'object',
                properties: {
                    mode: {
                        type: 'string',
                        enum: ['full', 'incremental', 'selective'],
                        description: '同步模式'
                    },
                    forceUpdate: {
                        type: 'boolean',
                        description: '强制更新'
                    },
                    dryRun: {
                        type: 'boolean',
                        description: '仅预览不执行'
                    },
                    productIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '产品ID列表（仅选择性同步）'
                    }
                },
                required: ['mode']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                syncResult: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        message: { type: 'string' },
                                        details: {
                                            type: 'object',
                                            properties: {
                                                created: { type: 'number' },
                                                updated: { type: 'number' },
                                                deleted: { type: 'number' },
                                                errors: { type: 'array' },
                                                duration: { type: 'number' }
                                            }
                                        }
                                    }
                                },
                                options: { type: 'object' },
                                timestamp: { type: 'string' }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.syncProducts.bind(syncController_1.syncController));
    // 同步图片数据
    fastify.post('/sync/images', {
        schema: {
            description: '同步图片数据',
            tags: ['sync'],
            body: {
                type: 'object',
                properties: {
                    productIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '产品ID列表'
                    },
                    dryRun: {
                        type: 'boolean',
                        description: '仅预览不执行'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.syncImages.bind(syncController_1.syncController));
    // 获取同步状态
    fastify.get('/sync/status', {
        schema: {
            description: '获取同步状态',
            tags: ['sync'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                status: { type: 'string' },
                                lastSyncTime: { type: 'string' },
                                syncHistory: { type: 'array' },
                                timestamp: { type: 'string' }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.getSyncStatus.bind(syncController_1.syncController));
    // 获取同步历史
    fastify.get('/sync/history', {
        schema: {
            description: '获取同步历史',
            tags: ['sync'],
            querystring: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'string',
                        description: '历史记录数量限制'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                history: { type: 'array' },
                                total: { type: 'number' },
                                limit: { type: 'number' },
                                timestamp: { type: 'string' }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.getSyncHistory.bind(syncController_1.syncController));
    // 验证数据一致性
    fastify.post('/sync/validate', {
        schema: {
            description: '验证数据一致性',
            tags: ['sync'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                isValid: { type: 'boolean' },
                                issues: { type: 'array' },
                                summary: {
                                    type: 'object',
                                    properties: {
                                        totalIssues: { type: 'number' },
                                        validationTime: { type: 'number' },
                                        timestamp: { type: 'string' }
                                    }
                                }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.validateDataConsistency.bind(syncController_1.syncController));
    // 修复数据问题
    fastify.post('/sync/repair', {
        schema: {
            description: '修复数据问题',
            tags: ['sync'],
            body: {
                type: 'object',
                properties: {
                    issueTypes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '要修复的问题类型'
                    },
                    dryRun: {
                        type: 'boolean',
                        description: '仅预览不执行'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                repaired: { type: 'array' },
                                failed: { type: 'array' },
                                summary: {
                                    type: 'object',
                                    properties: {
                                        totalRepaired: { type: 'number' },
                                        totalFailed: { type: 'number' },
                                        repairTime: { type: 'number' },
                                        dryRun: { type: 'boolean' },
                                        timestamp: { type: 'string' }
                                    }
                                }
                            }
                        },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, syncController_1.syncController.repairDataIssues.bind(syncController_1.syncController));
}
//# sourceMappingURL=sync.js.map
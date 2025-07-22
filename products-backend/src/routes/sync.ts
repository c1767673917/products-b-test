import { FastifyInstance } from 'fastify';
import { syncController } from '../controllers/syncController';

export async function syncRoutes(fastify: FastifyInstance) {
  // Phase 3: Enhanced API endpoints following api-design.md specifications
  
  // 1.1 触发飞书数据同步 (新的主要同步端点)
  fastify.post('/sync/feishu', {
    schema: {
      description: '触发从飞书多维表格的数据同步',
      tags: ['sync'],
      body: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['full', 'incremental', 'selective'],
            description: '同步模式'
          },
          productIds: {
            type: 'array',
            items: { type: 'string' },
            description: '选择性同步时的产品ID列表'
          },
          options: {
            type: 'object',
            properties: {
              downloadImages: { type: 'boolean', default: true },
              validateData: { type: 'boolean', default: true },
              dryRun: { type: 'boolean', default: false },
              batchSize: { type: 'number', default: 50 },
              concurrentImages: { type: 'number', default: 5 }
            }
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
                syncId: { type: 'string' },
                status: { type: 'string', enum: ['started', 'queued'] },
                estimatedDuration: { type: 'number' },
                websocketUrl: { type: 'string' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' },
            requestId: { type: 'string' }
          }
        }
      }
    }
  }, syncController.syncFromFeishu.bind(syncController));

  // 1.2 获取同步状态 (增强版)
  fastify.get('/sync/status', {
    schema: {
      description: '获取当前同步任务的状态信息',
      tags: ['sync'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                currentSync: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    syncId: { type: 'string' },
                    mode: { type: 'string' },
                    status: { type: 'string', enum: ['running', 'paused', 'completed', 'failed', 'cancelled'] },
                    startTime: { type: 'string' },
                    endTime: { type: 'string', nullable: true },
                    progress: {
                      type: 'object',
                      properties: {
                        totalRecords: { type: 'number' },
                        processedRecords: { type: 'number' },
                        totalImages: { type: 'number' },
                        processedImages: { type: 'number' },
                        percentage: { type: 'number' }
                      }
                    },
                    currentOperation: { type: 'string' },
                    errors: { type: 'array' }
                  }
                },
                lastSync: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    syncId: { type: 'string' },
                    endTime: { type: 'string' },
                    status: { type: 'string' },
                    duration: { type: 'number' },
                    stats: {
                      type: 'object',
                      properties: {
                        created: { type: 'number' },
                        updated: { type: 'number' },
                        deleted: { type: 'number' },
                        errors: { type: 'number' }
                      }
                    }
                  }
                }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.getSyncStatusEnhanced.bind(syncController));

  // 1.3 控制同步任务
  fastify.post('/sync/control', {
    schema: {
      description: '控制当前同步任务的执行',
      tags: ['sync'],
      body: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['pause', 'resume', 'cancel'] },
          syncId: { type: 'string', description: '可选，默认为当前任务' }
        },
        required: ['action']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                syncId: { type: 'string' },
                action: { type: 'string' },
                status: { type: 'string' },
                message: { type: 'string' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.controlSync.bind(syncController));

  // 1.4 获取同步历史 (增强版)
  fastify.get('/sync/history', {
    schema: {
      description: '获取历史同步记录',
      tags: ['sync'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '20' },
          status: { type: 'string', description: '状态过滤' },
          mode: { type: 'string', description: '模式过滤' },
          startDate: { type: 'string', description: '开始日期过滤' },
          endDate: { type: 'string', description: '结束日期过滤' }
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
                records: { type: 'array' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' }
                  }
                }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.getSyncHistoryEnhanced.bind(syncController));

  // 原有端点保持兼容性
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
  }, syncController.syncProducts.bind(syncController));

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
  }, syncController.syncImages.bind(syncController));

  // 获取同步状态 (简化版)
  fastify.get('/sync/status-simple', {
    schema: {
      description: '获取同步状态 (简化版)',
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
  }, syncController.getSyncStatus.bind(syncController));

  // 获取同步历史 (简化版)
  fastify.get('/sync/history-simple', {
    schema: {
      description: '获取同步历史 (简化版)',
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
  }, syncController.getSyncHistory.bind(syncController));

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
  }, syncController.validateDataConsistency.bind(syncController));

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
  }, syncController.repairDataIssues.bind(syncController));

  // 数据验证和修复 API (增强版)
  fastify.post('/sync/validate-enhanced', {
    schema: {
      description: '验证数据库数据与图片存储的一致性 (增强版)',
      tags: ['sync'],
      body: {
        type: 'object',
        properties: {
          scope: { type: 'string', enum: ['all', 'recent', 'selective'], default: 'all' },
          productIds: { type: 'array', items: { type: 'string' } },
          checks: { 
            type: 'array', 
            items: { type: 'string', enum: ['data_integrity', 'image_existence', 'field_validation'] },
            default: ['data_integrity', 'image_existence', 'field_validation']
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
                validationId: { type: 'string' },
                summary: {
                  type: 'object',
                  properties: {
                    totalChecked: { type: 'number' },
                    issuesFound: { type: 'number' },
                    criticalIssues: { type: 'number' },
                    warnings: { type: 'number' }
                  }
                },
                issues: { type: 'array' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.validateDataConsistencyEnhanced.bind(syncController));

  fastify.post('/sync/repair-enhanced', {
    schema: {
      description: '修复检测到的数据问题 (增强版)',
      tags: ['sync'],
      body: {
        type: 'object',
        properties: {
          validationId: { type: 'string' },
          issueTypes: { type: 'array', items: { type: 'string' } },
          productIds: { type: 'array', items: { type: 'string' } },
          dryRun: { type: 'boolean', default: false }
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
                repairId: { type: 'string' },
                summary: {
                  type: 'object',
                  properties: {
                    totalIssues: { type: 'number' },
                    repairedIssues: { type: 'number' },
                    failedRepairs: { type: 'number' }
                  }
                },
                results: { type: 'array' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.repairDataIssuesEnhanced.bind(syncController));

  // 同步服务状态
  fastify.get('/sync/service-status', {
    schema: {
      description: '获取同步服务的详细状态',
      tags: ['sync'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                isRunning: { type: 'boolean' },
                currentTasks: { type: 'number' },
                queuedTasks: { type: 'number' },
                lastSyncTime: { type: 'string', nullable: true },
                nextScheduledSync: { type: 'string', nullable: true },
                performance: {
                  type: 'object',
                  properties: {
                    averageSyncDuration: { type: 'number' },
                    successRate: { type: 'number' },
                    errorRate: { type: 'number' }
                  }
                },
                resources: {
                  type: 'object',
                  properties: {
                    memoryUsage: { type: 'number' },
                    diskUsage: { type: 'number' },
                    networkUsage: { type: 'number' }
                  }
                }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, syncController.getSyncServiceStatus.bind(syncController));
}
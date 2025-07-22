import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

interface SyncProgressMessage {
  type: 'progress';
  syncId: string;
  data: {
    stage: 'fetching_data' | 'processing_records' | 'downloading_images' | 'updating_database';
    progress: {
      current: number;
      total: number;
      percentage: number;
    };
    currentOperation: string;
    estimatedTimeRemaining: number;
  };
}

interface StatusChangeMessage {
  type: 'status_change';
  syncId: string;
  data: {
    oldStatus: string;
    newStatus: string;
    message: string;
    timestamp: string;
  };
}

interface ErrorMessage {
  type: 'error';
  syncId: string;
  data: {
    errorType: string;
    message: string;
    productId?: string;
    recoverable: boolean;
    timestamp: string;
  };
}

interface CompletionMessage {
  type: 'completion';
  syncId: string;
  data: {
    status: 'completed' | 'failed' | 'cancelled';
    duration: number;
    stats: {
      created: number;
      updated: number;
      deleted: number;
      errors: number;
    };
    summary: string;
  };
}

type WebSocketMessage = SyncProgressMessage | StatusChangeMessage | ErrorMessage | CompletionMessage;

export class WebSocketService {
  private clients: Map<string, WebSocket[]> = new Map();

  /**
   * 注册WebSocket路由
   */
  async registerRoutes(fastify: FastifyInstance) {
    await fastify.register(require('@fastify/websocket'));

    fastify.get('/sync/progress', { websocket: true }, (connection, req) => {
      const query = req.query as { syncId?: string };
      const syncId = query.syncId || 'all';
      
      // 添加客户端连接
      this.addClient(syncId, connection.socket);
      
      connection.socket.on('close', () => {
        this.removeClient(syncId, connection.socket);
      });

      connection.socket.on('error', (error) => {
        req.log.error('WebSocket连接错误:', error);
        this.removeClient(syncId, connection.socket);
      });

      // 发送连接确认消息
      this.sendMessage(connection.socket, {
        type: 'status_change',
        syncId,
        data: {
          oldStatus: 'disconnected',
          newStatus: 'connected',
          message: 'WebSocket连接已建立',
          timestamp: new Date().toISOString()
        }
      });
    });
  }

  /**
   * 添加客户端连接
   */
  private addClient(syncId: string, socket: WebSocket) {
    if (!this.clients.has(syncId)) {
      this.clients.set(syncId, []);
    }
    this.clients.get(syncId)!.push(socket);
    console.log(`WebSocket客户端连接: ${syncId}, 当前连接数: ${this.clients.get(syncId)!.length}`);
  }

  /**
   * 移除客户端连接
   */
  private removeClient(syncId: string, socket: WebSocket) {
    const clients = this.clients.get(syncId);
    if (clients) {
      const index = clients.indexOf(socket);
      if (index > -1) {
        clients.splice(index, 1);
        console.log(`WebSocket客户端断开: ${syncId}, 当前连接数: ${clients.length}`);
        
        if (clients.length === 0) {
          this.clients.delete(syncId);
        }
      }
    }
  }

  /**
   * 向指定同步任务的所有客户端发送消息
   */
  broadcastToSync(syncId: string, message: WebSocketMessage) {
    // 发送给指定同步任务的客户端
    this.broadcastMessage(syncId, message);
    
    // 发送给监听所有任务的客户端
    this.broadcastMessage('all', message);
  }

  /**
   * 发送进度更新消息
   */
  sendProgress(syncId: string, stage: SyncProgressMessage['data']['stage'], progress: SyncProgressMessage['data']['progress'], currentOperation: string, estimatedTimeRemaining: number) {
    const message: SyncProgressMessage = {
      type: 'progress',
      syncId,
      data: {
        stage,
        progress,
        currentOperation,
        estimatedTimeRemaining
      }
    };
    
    this.broadcastToSync(syncId, message);
  }

  /**
   * 发送状态变更消息
   */
  sendStatusChange(syncId: string, oldStatus: string, newStatus: string, messageText: string) {
    const message: StatusChangeMessage = {
      type: 'status_change',
      syncId,
      data: {
        oldStatus,
        newStatus,
        message: messageText,
        timestamp: new Date().toISOString()
      }
    };
    
    this.broadcastToSync(syncId, message);
  }

  /**
   * 发送错误消息
   */
  sendError(syncId: string, errorType: string, errorMessage: string, productId?: string, recoverable: boolean = true) {
    const message: ErrorMessage = {
      type: 'error',
      syncId,
      data: {
        errorType,
        message: errorMessage,
        productId,
        recoverable,
        timestamp: new Date().toISOString()
      }
    };
    
    this.broadcastToSync(syncId, message);
  }

  /**
   * 发送完成消息
   */
  sendCompletion(syncId: string, status: CompletionMessage['data']['status'], duration: number, stats: CompletionMessage['data']['stats'], summary: string) {
    const message: CompletionMessage = {
      type: 'completion',
      syncId,
      data: {
        status,
        duration,
        stats,
        summary
      }
    };
    
    this.broadcastToSync(syncId, message);
  }

  /**
   * 广播消息给指定组的所有客户端
   */
  private broadcastMessage(syncId: string, message: WebSocketMessage) {
    const clients = this.clients.get(syncId);
    if (clients) {
      clients.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
          this.sendMessage(socket, message);
        }
      });
    }
  }

  /**
   * 发送消息给单个客户端
   */
  private sendMessage(socket: WebSocket, message: WebSocketMessage) {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
    }
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats() {
    const stats: Record<string, number> = {};
    this.clients.forEach((clients, syncId) => {
      stats[syncId] = clients.length;
    });
    return stats;
  }
}

export const webSocketService = new WebSocketService();
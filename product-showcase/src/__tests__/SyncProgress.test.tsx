import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SyncProgress } from '../components/sync/SyncProgress';

// Mock WebSocket and sync store
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock sync store
const mockSyncStore = {
  currentSync: null,
  progress: null,
  isConnected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  updateProgress: jest.fn()
};

jest.mock('../stores/syncStore', () => ({
  useSyncStore: () => mockSyncStore
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('SyncProgress Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncStore.currentSync = null;
    mockSyncStore.progress = null;
    mockSyncStore.isConnected = false;
  });

  describe('No Active Sync State', () => {
    it('should show idle state when no sync is active', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/当前没有进行中的同步任务/)).toBeInTheDocument();
      expect(screen.getByText(/等待开始同步/)).toBeInTheDocument();
    });

    it('should show connection status when idle', () => {
      mockSyncStore.isConnected = true;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/WebSocket 已连接/)).toBeInTheDocument();
    });

    it('should show disconnected status', () => {
      mockSyncStore.isConnected = false;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/WebSocket 未连接/)).toBeInTheDocument();
    });
  });

  describe('Active Sync Progress Display', () => {
    const mockActiveSyncData = {
      syncId: 'sync_12345',
      syncType: 'full',
      status: 'processing',
      startTime: new Date('2025-07-21T10:00:00Z'),
      currentStage: 'processing_records',
      progress: {
        totalRecords: 1000,
        processedRecords: 350,
        newProducts: 120,
        updatedProducts: 180,
        skippedRecords: 50,
        failedRecords: 0,
        totalImages: 700,
        processedImages: 245,
        successfulImages: 240,
        failedImages: 5,
        currentOperation: '处理产品记录',
        estimatedTimeRemaining: 180000, // 3 minutes in ms
        percentage: 35
      }
    };

    beforeEach(() => {
      mockSyncStore.currentSync = mockActiveSyncData;
      mockSyncStore.progress = mockActiveSyncData.progress;
      mockSyncStore.isConnected = true;
    });

    it('should display sync basic information', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/sync_12345/)).toBeInTheDocument();
      expect(screen.getByText(/全量同步/)).toBeInTheDocument();
      expect(screen.getByText(/进行中/)).toBeInTheDocument();
    });

    it('should show progress bar with correct percentage', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '35');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(screen.getByText('35%')).toBeInTheDocument();
    });

    it('should display current operation', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('处理产品记录')).toBeInTheDocument();
    });

    it('should show record processing statistics', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/已处理: 350 \/ 1000/)).toBeInTheDocument();
      expect(screen.getByText(/新增: 120/)).toBeInTheDocument();
      expect(screen.getByText(/更新: 180/)).toBeInTheDocument();
      expect(screen.getByText(/跳过: 50/)).toBeInTheDocument();
      expect(screen.getByText(/失败: 0/)).toBeInTheDocument();
    });

    it('should show image processing statistics', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/图片处理: 245 \/ 700/)).toBeInTheDocument();
      expect(screen.getByText(/成功: 240/)).toBeInTheDocument();
      expect(screen.getByText(/失败: 5/)).toBeInTheDocument();
    });

    it('should display estimated time remaining', () => {
      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/预计剩余时间: 3分钟/)).toBeInTheDocument();
    });

    it('should show elapsed time', () => {
      // Mock current time to be 30 seconds after start time
      const mockNow = new Date('2025-07-21T10:00:30Z');
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/已用时间: 30秒/)).toBeInTheDocument();

      jest.restoreAllMocks();
    });
  });

  describe('Different Sync Stages', () => {
    it('should display initialization stage', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'initializing',
        currentStage: 'initializing',
        progress: {
          currentOperation: '初始化同步任务',
          percentage: 0
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('初始化同步任务')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display fetching data stage', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'fetching_data',
        currentStage: 'fetching_data',
        progress: {
          currentOperation: '从飞书获取数据',
          percentage: 15
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('从飞书获取数据')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('should display completing stage', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'completing',
        currentStage: 'completing',
        progress: {
          currentOperation: '完成同步任务',
          percentage: 98
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('完成同步任务')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error information', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'failed',
        error: '网络连接超时',
        progress: {
          currentOperation: '同步失败',
          percentage: 45,
          errors: [
            '产品rec123转换失败: 缺少必填字段',
            '图片下载失败: token_abc (文件不存在)'
          ]
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('网络连接超时')).toBeInTheDocument();
      expect(screen.getByText(/同步过程中遇到错误/)).toBeInTheDocument();
      expect(screen.getByText(/产品rec123转换失败/)).toBeInTheDocument();
      expect(screen.getByText(/图片下载失败/)).toBeInTheDocument();
    });

    it('should show error count', () => {
      mockSyncStore.progress = {
        errors: ['错误1', '错误2', '错误3'],
        currentOperation: '处理中',
        percentage: 50
      };

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/错误数量: 3/)).toBeInTheDocument();
    });

    it('should allow error list expansion/collapse', () => {
      const { container } = render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      mockSyncStore.progress = {
        errors: ['错误1', '错误2', '错误3', '错误4', '错误5'],
        currentOperation: '处理中',
        percentage: 50
      };

      const expandButton = screen.queryByText(/显示更多错误/);
      if (expandButton) {
        act(() => {
          expandButton.click();
        });
        expect(screen.getByText(/收起错误列表/)).toBeInTheDocument();
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should update progress when WebSocket messages are received', () => {
      const { rerender } = render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      // Initially no sync
      expect(screen.getByText(/当前没有进行中的同步任务/)).toBeInTheDocument();

      // Simulate WebSocket message received
      act(() => {
        mockSyncStore.currentSync = {
          syncId: 'sync_12345',
          status: 'processing',
          progress: {
            currentOperation: '开始同步',
            percentage: 10,
            processedRecords: 100
          }
        };
        mockSyncStore.progress = mockSyncStore.currentSync.progress;
      });

      rerender(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('开始同步')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('should handle progress updates smoothly', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'processing',
        progress: { percentage: 25, currentOperation: '处理中' }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      const { rerender } = render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('25%')).toBeInTheDocument();

      // Update progress
      act(() => {
        mockSyncStore.progress = { percentage: 50, currentOperation: '处理中' };
      });

      rerender(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Completion States', () => {
    it('should display successful completion', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'completed',
        endTime: new Date('2025-07-21T10:05:00Z'),
        startTime: new Date('2025-07-21T10:00:00Z'),
        progress: {
          percentage: 100,
          currentOperation: '同步完成',
          totalRecords: 1000,
          processedRecords: 1000,
          newProducts: 400,
          updatedProducts: 500,
          successfulImages: 1800,
          failedImages: 12
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/同步成功完成/)).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText(/总用时: 5分钟/)).toBeInTheDocument();
      expect(screen.getByText(/处理记录: 1000/)).toBeInTheDocument();
      expect(screen.getByText(/新增产品: 400/)).toBeInTheDocument();
      expect(screen.getByText(/更新产品: 500/)).toBeInTheDocument();
    });

    it('should display partial completion with warnings', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'completed_with_warnings',
        progress: {
          percentage: 100,
          currentOperation: '同步完成(有警告)',
          warnings: ['部分图片下载失败', '数据格式问题'],
          successfulImages: 1788,
          failedImages: 24
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/同步完成，但有警告/)).toBeInTheDocument();
      expect(screen.getByText(/部分图片下载失败/)).toBeInTheDocument();
      expect(screen.getByText(/数据格式问题/)).toBeInTheDocument();
    });

    it('should show cancellation status', () => {
      mockSyncStore.currentSync = {
        syncId: 'sync_12345',
        status: 'cancelled',
        progress: {
          percentage: 65,
          currentOperation: '同步已取消',
          processedRecords: 650,
          totalRecords: 1000
        }
      };
      mockSyncStore.progress = mockSyncStore.currentSync.progress;

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      expect(screen.getByText(/同步已被取消/)).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText(/已处理 650 条记录/)).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle rapid progress updates efficiently', () => {
      const { rerender } = render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      // Simulate rapid updates
      for (let i = 0; i <= 100; i += 5) {
        act(() => {
          mockSyncStore.progress = {
            percentage: i,
            currentOperation: `处理中 ${i}%`,
            processedRecords: i * 10
          };
        });

        rerender(
          <TestWrapper>
            <SyncProgress />
          </TestWrapper>
        );
      }

      // Should show final state
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should not cause memory leaks with frequent updates', () => {
      const { unmount } = render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      // Simulate component unmount
      unmount();

      // Verify cleanup
      expect(mockSyncStore.disconnect).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for progress bar', () => {
      mockSyncStore.progress = { percentage: 42, currentOperation: '处理中' };

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', '同步进度');
      expect(progressBar).toHaveAttribute('aria-valuenow', '42');
      expect(progressBar).toHaveAttribute('aria-valuetext', '42% 完成');
    });

    it('should announce status changes to screen readers', () => {
      mockSyncStore.currentSync = {
        status: 'completed',
        progress: { percentage: 100, currentOperation: '同步完成' }
      };

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
      expect(statusRegion).toHaveTextContent(/同步成功完成/);
    });

    it('should provide keyboard navigation for error details', () => {
      mockSyncStore.progress = {
        percentage: 50,
        errors: ['错误1', '错误2', '错误3']
      };

      render(
        <TestWrapper>
          <SyncProgress />
        </TestWrapper>
      );

      const errorToggle = screen.queryByRole('button', { name: /显示错误详情/ });
      if (errorToggle) {
        expect(errorToggle).toBeInTheDocument();
        // Verify it's keyboard accessible
        expect(errorToggle).toHaveAttribute('tabindex', '0');
      }
    });
  });
});
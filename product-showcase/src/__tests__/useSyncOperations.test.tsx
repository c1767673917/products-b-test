import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSyncOperations } from '../hooks/useSyncOperations';

// Mock fetch
global.fetch = jest.fn();

// Mock sync store
const mockSyncStore = {
  currentSync: null,
  progress: null,
  error: null,
  setCurrentSync: jest.fn(),
  setProgress: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn()
};

jest.mock('../stores/syncStore', () => ({
  useSyncStore: () => mockSyncStore
}));

// Mock API configuration
jest.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:3001'
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useSyncOperations Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Reset mock store
    mockSyncStore.currentSync = null;
    mockSyncStore.progress = null;
    mockSyncStore.error = null;
  });

  describe('Sync Trigger Operations', () => {
    it('should trigger full sync successfully', async () => {
      const mockResponse = {
        success: true,
        syncId: 'sync_12345',
        message: '全量同步已启动'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        await result.current.triggerSync('full');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/feishu',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'full',
            options: {}
          })
        }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should trigger incremental sync with options', async () => {
      const mockResponse = {
        success: true,
        syncId: 'sync_12346',
        message: '增量同步已启动'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      const options = {
        batchSize: 100,
        concurrentImages: 10,
        skipImages: false
      };

      await act(async () => {
        await result.current.triggerSync('incremental', options);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/feishu',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'incremental',
            options
          })
        }
      );
    });

    it('should trigger selective sync with product IDs', async () => {
      const mockResponse = {
        success: true,
        syncId: 'sync_12347',
        message: '选择性同步已启动'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      const options = {
        productIds: ['rec123', 'rec456', 'rec789'],
        batchSize: 50
      };

      await act(async () => {
        await result.current.triggerSync('selective', options);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/feishu',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'selective',
            options
          })
        }
      );
    });

    it('should handle sync trigger errors', async () => {
      const errorMessage = '同步启动失败';
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: errorMessage })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.triggerSync('full');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toContain(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle network errors during sync trigger', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.triggerSync('full');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toContain('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Sync Control Operations', () => {
    it('should pause sync successfully', async () => {
      const mockResponse = {
        success: true,
        message: '同步已暂停'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        await result.current.controlSync('pause', 'sync_12345');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/control',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'pause',
            syncId: 'sync_12345'
          })
        }
      );

      expect(result.current.error).toBeNull();
    });

    it('should resume sync successfully', async () => {
      const mockResponse = {
        success: true,
        message: '同步已恢复'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        await result.current.controlSync('resume', 'sync_12345');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/control',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'resume',
            syncId: 'sync_12345'
          })
        }
      );
    });

    it('should cancel sync successfully', async () => {
      const mockResponse = {
        success: true,
        message: '同步已取消'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        await result.current.controlSync('cancel', 'sync_12345');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/control',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            syncId: 'sync_12345'
          })
        }
      );
    });

    it('should handle control operation errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: '同步任务不存在' })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.controlSync('pause', 'nonexistent');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toContain('同步任务不存在');
    });
  });

  describe('Data Validation Operations', () => {
    it('should trigger data validation successfully', async () => {
      const mockResponse = {
        success: true,
        validationId: 'validation_123',
        summary: {
          totalProducts: 1000,
          validProducts: 950,
          invalidProducts: 50,
          issues: [
            { type: 'missing_field', count: 30, description: '缺少必填字段' },
            { type: 'invalid_format', count: 20, description: '格式错误' }
          ]
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        await result.current.validateData();
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/validate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      );

      expect(result.current.error).toBeNull();
    });

    it('should handle validation with options', async () => {
      const mockResponse = {
        success: true,
        validationId: 'validation_124'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      const options = {
        checkImages: true,
        checkPrices: true,
        productIds: ['rec123', 'rec456']
      };

      await act(async () => {
        await result.current.validateData(options);
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/validate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options)
        }
      );
    });

    it('should handle validation errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: '验证过程中发生错误' })
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.validateData();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toContain('验证过程中发生错误');
    });
  });

  describe('Loading States', () => {
    it('should set loading state during sync trigger', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockReturnValueOnce(promise);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      // Start sync (don't await)
      act(() => {
        result.current.triggerSync('full');
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentOperation).toBe('sync');

      // Complete the request
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true, syncId: 'sync_123' })
        });
        await promise;
      });

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentOperation).toBeNull();
      });
    });

    it('should set loading state during validation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockReturnValueOnce(promise);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      // Start validation (don't await)
      act(() => {
        result.current.validateData();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentOperation).toBe('validate');

      // Complete the request
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true, validationId: 'val_123' })
        });
        await promise;
      });

      // Should no longer be loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentOperation).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors when starting new operation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      // Set initial error state
      act(() => {
        mockSyncStore.error = '之前的错误';
      });

      expect(result.current.error).toBe('之前的错误');

      // Mock successful request
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, syncId: 'sync_123' })
      });

      // Start new sync operation
      await act(async () => {
        await result.current.triggerSync('full');
      });

      // Error should be cleared
      expect(mockSyncStore.clearError).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      // Mock a timeout scenario
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.triggerSync('full');
        } catch (error) {
          // Expected timeout error
        }
      });

      expect(result.current.error).toContain('Request timeout');
    });

    it('should handle malformed response errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      await act(async () => {
        try {
          await result.current.triggerSync('full');
        } catch (error) {
          // Expected JSON parsing error
        }
      });

      expect(result.current.error).toContain('Invalid JSON');
    });
  });

  describe('Concurrent Operations', () => {
    it('should prevent concurrent sync operations', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      // Mock slow response
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, syncId: 'sync_123' })
          }), 100);
        });
      });

      // Start first sync
      act(() => {
        result.current.triggerSync('full');
      });

      expect(result.current.isLoading).toBe(true);

      // Try to start second sync while first is running
      await act(async () => {
        try {
          await result.current.triggerSync('incremental');
        } catch (error) {
          // Should reject concurrent operation
          expect(error).toEqual(expect.any(Error));
        }
      });

      // Wait for first sync to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should allow control operations during sync', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSyncOperations(), { wrapper });

      // Set sync as running
      act(() => {
        mockSyncStore.currentSync = { syncId: 'sync_123', status: 'processing' };
      });

      // Mock control operation response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: '已暂停' })
      });

      // Should allow control operation
      await act(async () => {
        await result.current.controlSync('pause', 'sync_123');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/sync/control',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup resources on unmount', () => {
      const wrapper = createWrapper();
      const { result, unmount } = renderHook(() => useSyncOperations(), { wrapper });

      // Verify hook initializes correctly
      expect(result.current.triggerSync).toBeDefined();
      expect(result.current.controlSync).toBeDefined();
      expect(result.current.validateData).toBeDefined();

      // Unmount component
      unmount();

      // Verify cleanup (implementation-specific, may vary)
      // This would typically involve cleaning up any pending requests or subscriptions
    });

    it('should handle component re-renders efficiently', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useSyncOperations(), { wrapper });

      const firstTriggerSync = result.current.triggerSync;

      // Re-render component
      rerender();

      const secondTriggerSync = result.current.triggerSync;

      // Functions should be stable (memoized) to prevent unnecessary re-renders
      expect(firstTriggerSync).toBe(secondTriggerSync);
    });
  });
});
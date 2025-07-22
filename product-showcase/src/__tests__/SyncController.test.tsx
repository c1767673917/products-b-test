import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SyncController } from '../components/sync/SyncController';
import { useSyncOperations } from '../hooks/useSyncOperations';

// Mock the hooks
jest.mock('../hooks/useSyncOperations');
jest.mock('../stores/syncStore');

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1
})) as any;

const mockUseSyncOperations = useSyncOperations as jest.MockedFunction<typeof useSyncOperations>;

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

describe('SyncController Component', () => {
  const mockTriggerSync = jest.fn();
  const mockControlSync = jest.fn();
  const mockValidateData = jest.fn();

  const defaultMockReturn = {
    triggerSync: mockTriggerSync,
    controlSync: mockControlSync,
    validateData: mockValidateData,
    isLoading: false,
    currentOperation: null,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSyncOperations.mockReturnValue(defaultMockReturn);
  });

  describe('Sync Mode Selection', () => {
    it('should render all sync mode options', () => {
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/全量同步/)).toBeInTheDocument();
      expect(screen.getByLabelText(/增量同步/)).toBeInTheDocument();
      expect(screen.getByLabelText(/选择性同步/)).toBeInTheDocument();
    });

    it('should default to full sync mode', () => {
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const fullSyncRadio = screen.getByLabelText(/全量同步/) as HTMLInputElement;
      expect(fullSyncRadio.checked).toBe(true);
    });

    it('should switch sync modes correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const incrementalSyncRadio = screen.getByLabelText(/增量同步/);
      await user.click(incrementalSyncRadio);

      expect(incrementalSyncRadio).toBeChecked();
    });

    it('should show product ID input for selective sync', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const selectiveSyncRadio = screen.getByLabelText(/选择性同步/);
      await user.click(selectiveSyncRadio);

      expect(screen.getByPlaceholderText(/请输入产品ID/)).toBeInTheDocument();
    });
  });

  describe('Sync Options Configuration', () => {
    it('should toggle advanced options panel', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const advancedOptionsButton = screen.getByText(/高级选项/);
      await user.click(advancedOptionsButton);

      expect(screen.getByText(/批处理大小/)).toBeInTheDocument();
      expect(screen.getByText(/并发图片下载数/)).toBeInTheDocument();
      expect(screen.getByText(/跳过图片下载/)).toBeInTheDocument();
    });

    it('should update batch size option', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      // Open advanced options
      const advancedOptionsButton = screen.getByText(/高级选项/);
      await user.click(advancedOptionsButton);

      const batchSizeInput = screen.getByDisplayValue('50'); // Default batch size
      await user.clear(batchSizeInput);
      await user.type(batchSizeInput, '100');

      expect(batchSizeInput).toHaveValue(100);
    });

    it('should toggle skip images option', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      // Open advanced options
      const advancedOptionsButton = screen.getByText(/高级选项/);
      await user.click(advancedOptionsButton);

      const skipImagesCheckbox = screen.getByLabelText(/跳过图片下载/);
      await user.click(skipImagesCheckbox);

      expect(skipImagesCheckbox).toBeChecked();
    });
  });

  describe('Sync Execution', () => {
    it('should trigger full sync with correct parameters', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(mockTriggerSync).toHaveBeenCalledWith('full', {
        batchSize: 50,
        concurrentImages: 5,
        skipImages: false
      });
    });

    it('should trigger incremental sync', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const incrementalSyncRadio = screen.getByLabelText(/增量同步/);
      await user.click(incrementalSyncRadio);

      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(mockTriggerSync).toHaveBeenCalledWith('incremental', expect.any(Object));
    });

    it('should trigger selective sync with product IDs', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const selectiveSyncRadio = screen.getByLabelText(/选择性同步/);
      await user.click(selectiveSyncRadio);

      const productIdInput = screen.getByPlaceholderText(/请输入产品ID/);
      await user.type(productIdInput, 'rec123,rec456,rec789');

      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(mockTriggerSync).toHaveBeenCalledWith('selective', {
        productIds: ['rec123', 'rec456', 'rec789'],
        batchSize: 50,
        concurrentImages: 5,
        skipImages: false
      });
    });

    it('should validate product IDs for selective sync', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const selectiveSyncRadio = screen.getByLabelText(/选择性同步/);
      await user.click(selectiveSyncRadio);

      const productIdInput = screen.getByPlaceholderText(/请输入产品ID/);
      await user.type(productIdInput, 'invalid-id,rec456');

      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(screen.getByText(/无效的产品ID格式/)).toBeInTheDocument();
    });

    it('should disable sync button when sync is in progress', () => {
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'sync'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const syncButton = screen.getByText(/同步中.../);
      expect(syncButton).toBeDisabled();
    });
  });

  describe('Sync Control Operations', () => {
    it('should show control buttons during sync', () => {
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'sync'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      expect(screen.getByText(/暂停同步/)).toBeInTheDocument();
      expect(screen.getByText(/取消同步/)).toBeInTheDocument();
    });

    it('should pause sync operation', async () => {
      const user = userEvent.setup();
      
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'sync'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const pauseButton = screen.getByText(/暂停同步/);
      await user.click(pauseButton);

      expect(mockControlSync).toHaveBeenCalledWith('pause');
    });

    it('should resume sync operation', async () => {
      const user = userEvent.setup();
      
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: false,
        currentOperation: 'paused'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const resumeButton = screen.getByText(/恢复同步/);
      await user.click(resumeButton);

      expect(mockControlSync).toHaveBeenCalledWith('resume');
    });

    it('should cancel sync operation', async () => {
      const user = userEvent.setup();
      
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'sync'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const cancelButton = screen.getByText(/取消同步/);
      await user.click(cancelButton);

      expect(mockControlSync).toHaveBeenCalledWith('cancel');
    });
  });

  describe('Configuration Persistence', () => {
    it('should save sync configuration', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      // Configure sync settings
      const incrementalSyncRadio = screen.getByLabelText(/增量同步/);
      await user.click(incrementalSyncRadio);

      // Open advanced options
      const advancedOptionsButton = screen.getByText(/高级选项/);
      await user.click(advancedOptionsButton);

      const batchSizeInput = screen.getByDisplayValue('50');
      await user.clear(batchSizeInput);
      await user.type(batchSizeInput, '100');

      // Save configuration
      const saveConfigButton = screen.getByText(/保存配置/);
      await user.click(saveConfigButton);

      expect(screen.getByText(/配置已保存/)).toBeInTheDocument();
    });

    it('should load saved sync configuration', () => {
      // Mock localStorage with saved config
      const savedConfig = JSON.stringify({
        syncMode: 'incremental',
        batchSize: 100,
        concurrentImages: 10,
        skipImages: true
      });
      localStorage.setItem('syncConfig', savedConfig);

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const incrementalSyncRadio = screen.getByLabelText(/增量同步/) as HTMLInputElement;
      expect(incrementalSyncRadio.checked).toBe(true);

      // Open advanced options to check other settings
      const advancedOptionsButton = screen.getByText(/高级选项/);
      fireEvent.click(advancedOptionsButton);

      const batchSizeInput = screen.getByDisplayValue('100');
      expect(batchSizeInput).toBeInTheDocument();

      const skipImagesCheckbox = screen.getByLabelText(/跳过图片下载/) as HTMLInputElement;
      expect(skipImagesCheckbox.checked).toBe(true);

      // Clean up
      localStorage.removeItem('syncConfig');
    });
  });

  describe('Error Handling', () => {
    it('should display sync errors', () => {
      const errorMessage = '同步过程中发生错误';
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        error: errorMessage
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should clear errors when starting new sync', async () => {
      const user = userEvent.setup();
      
      // First render with error
      const { rerender } = render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        error: '之前的错误'
      });

      rerender(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      expect(screen.getByText(/之前的错误/)).toBeInTheDocument();

      // Clear error and start new sync
      mockUseSyncOperations.mockReturnValue(defaultMockReturn);

      rerender(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(screen.queryByText(/之前的错误/)).not.toBeInTheDocument();
    });

    it('should handle validation errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const selectiveSyncRadio = screen.getByLabelText(/选择性同步/);
      await user.click(selectiveSyncRadio);

      // Try to sync without product IDs
      const syncButton = screen.getByText(/开始同步/);
      await user.click(syncButton);

      expect(screen.getByText(/请输入至少一个产品ID/)).toBeInTheDocument();
    });
  });

  describe('Data Validation Features', () => {
    it('should trigger data validation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const validateButton = screen.getByText(/数据验证/);
      await user.click(validateButton);

      expect(mockValidateData).toHaveBeenCalled();
    });

    it('should show validation in progress state', () => {
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'validate'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const validateButton = screen.getByText(/验证中.../);
      expect(validateButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', '同步模式选择');
      expect(screen.getByRole('button', { name: /开始同步/ })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const fullSyncRadio = screen.getByLabelText(/全量同步/);
      fullSyncRadio.focus();

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      const incrementalSyncRadio = screen.getByLabelText(/增量同步/);
      expect(incrementalSyncRadio).toHaveFocus();

      // Select with Enter/Space
      await user.keyboard('{Enter}');
      expect(incrementalSyncRadio).toBeChecked();
    });

    it('should announce state changes to screen readers', async () => {
      const user = userEvent.setup();
      
      mockUseSyncOperations.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        currentOperation: 'sync'
      });

      render(
        <TestWrapper>
          <SyncController />
        </TestWrapper>
      );

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveTextContent(/同步正在进行中/);
    });
  });
});
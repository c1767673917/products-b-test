import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductDetail from '../pages/ProductDetail/ProductDetail';
import { useProductStore } from '../stores/productStore';

// Mock the product store
const mockProducts = [
  {
    id: 'test-product-1',
    recordId: 'test-record-001',
    name: '测试产品',
    sequence: '001',
    price: {
      normal: 100,
      discount: 80,
      discountRate: 0.2
    },
    category: {
      primary: '食品',
      secondary: '零食'
    },
    origin: {
      country: '中国',
      province: '北京',
      city: '北京市'
    },
    platform: '测试平台',
    specification: '100g',
    flavor: '原味',
    manufacturer: '测试厂商',
    collectTime: Date.now(),
    images: {
      front: '/test-image-1.jpg',
      back: '/test-image-2.jpg',
      label: '/test-image-3.jpg'
    }
  }
];

// Mock useParams to return our test product ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-product-1' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock the product store
vi.mock('../stores/productStore', () => ({
  useProductStore: vi.fn(() => ({
    products: mockProducts,
    favorites: [],
    compareList: [],
    toggleFavorite: vi.fn(),
    addToCompare: vi.fn(),
    removeFromCompare: vi.fn(),
    isLoading: false
  }))
}));

// Mock toast notifications
vi.mock('../components/ui/ToastNotification', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ProductDetail Layout Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should render product detail page with correct layout structure', async () => {
    render(
      <TestWrapper>
        <ProductDetail />
      </TestWrapper>
    );

    // Wait for the product to load
    await waitFor(() => {
      expect(screen.getByText('测试产品')).toBeInTheDocument();
    });

    // Check if the main layout grid exists
    const mainContent = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3');
    expect(mainContent).toBeInTheDocument();

    // Check if the image gallery section exists and has correct classes
    const imageSection = document.querySelector('.lg\\:col-span-2');
    expect(imageSection).toBeInTheDocument();

    // Check if the product info section exists
    const productInfoSection = document.querySelector('.lg\\:col-span-1');
    expect(productInfoSection).toBeInTheDocument();
  });

  it('should display product images with correct aspect ratios', async () => {
    render(
      <TestWrapper>
        <ProductDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('测试产品')).toBeInTheDocument();
    });

    // Check if the image container has the correct aspect ratio classes
    const imageContainer = document.querySelector('.aspect-\\[4\\/3\\]');
    expect(imageContainer).toBeInTheDocument();
  });

  it('should display product information in correct order', async () => {
    render(
      <TestWrapper>
        <ProductDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('测试产品')).toBeInTheDocument();
    });

    // Check if product name is displayed
    expect(screen.getByText('测试产品')).toBeInTheDocument();

    // Check if price information is displayed
    expect(screen.getByText('¥80.00')).toBeInTheDocument(); // Discount price
    expect(screen.getByText('¥100.00')).toBeInTheDocument(); // Original price

    // Check if basic information is displayed
    expect(screen.getByText('食品 / 零食')).toBeInTheDocument();
    expect(screen.getByText('北京 北京市')).toBeInTheDocument();
    expect(screen.getByText('测试平台')).toBeInTheDocument();
  });

  it('should have responsive design classes', async () => {
    render(
      <TestWrapper>
        <ProductDetail />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('测试产品')).toBeInTheDocument();
    });

    // Check if responsive classes are applied to the main container
    const mainContainer = document.querySelector('.max-w-7xl.mx-auto');
    expect(mainContainer).toBeInTheDocument();

    // Check if responsive padding classes are applied
    const paddingContainer = document.querySelector('.px-4.sm\\:px-6.lg\\:px-8');
    expect(paddingContainer).toBeInTheDocument();
  });

  it('should display loading state correctly', () => {
    // Mock loading state
    (useProductStore as any).mockReturnValue({
      products: [],
      favorites: [],
      compareList: [],
      toggleFavorite: vi.fn(),
      addToCompare: vi.fn(),
      removeFromCompare: vi.fn(),
      isLoading: true
    });

    render(
      <TestWrapper>
        <ProductDetail />
      </TestWrapper>
    );

    // Check if loading spinner is displayed
    expect(screen.getByText('正在加载产品信息...')).toBeInTheDocument();
  });
});

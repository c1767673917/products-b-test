import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LazyImage, { ImageCache, useImagePreloader } from '../LazyImage';
import { renderHook, act } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    img: ({ children, ...props }: any) => <img {...props}>{children}</img>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('LazyImage', () => {
  beforeEach(() => {
    ImageCache.clear();
  });

  it('renders placeholder when not in view', () => {
    render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        className="test-class"
      />
    );

    expect(screen.getByText('优先加载')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Test image')).not.toBeInTheDocument();
  });

  it('renders image when priority is true', () => {
    render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        priority={true}
      />
    );

    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        priority={true}
      />
    );

    // 应该显示加载指示器
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles image load event', async () => {
    const onLoad = vi.fn();
    
    render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        priority={true}
        onLoad={onLoad}
      />
    );

    const img = screen.getByAltText('Test image');
    
    // 模拟图片加载完成
    fireEvent.load(img);
    
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('handles image error with retry', async () => {
    const onError = vi.fn();
    
    render(
      <LazyImage
        src="/invalid-image.jpg"
        alt="Test image"
        priority={true}
        onError={onError}
        retryCount={2}
      />
    );

    const img = screen.getByAltText('Test image');
    
    // 模拟图片加载失败
    fireEvent.error(img);
    
    // 应该显示重试信息
    await waitFor(() => {
      expect(screen.getByText(/重试/)).toBeInTheDocument();
    });
  });

  it('shows error state after max retries', async () => {
    render(
      <LazyImage
        src="/invalid-image.jpg"
        alt="Test image"
        priority={true}
        retryCount={0}
      />
    );

    const img = screen.getByAltText('Test image');
    fireEvent.error(img);
    
    await waitFor(() => {
      expect(screen.getByText('图片加载失败')).toBeInTheDocument();
    });
  });

  it('applies blur effect when enabled', () => {
    render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        priority={true}
        blur={true}
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img).toHaveClass('blur-sm');
  });

  it('optimizes image src with quality parameter', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        priority={true}
        quality={75}
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img.src).toContain('q=75');
  });
});

describe('ImageCache', () => {
  beforeEach(() => {
    ImageCache.clear();
  });

  it('caches images after preload', async () => {
    const mockImg = {
      onload: null as any,
      onerror: null as any,
      src: '',
    };

    // Mock Image constructor
    global.Image = vi.fn(() => mockImg) as any;

    const preloadPromise = ImageCache.preload('/test-image.jpg');
    
    // 模拟图片加载成功
    mockImg.onload();
    
    await preloadPromise;
    
    const stats = ImageCache.getStats();
    expect(stats.cached).toBe(1);
  });

  it('handles preload errors gracefully', async () => {
    const mockImg = {
      onload: null as any,
      onerror: null as any,
      src: '',
    };

    global.Image = vi.fn(() => mockImg) as any;

    const preloadPromise = ImageCache.preload('/invalid-image.jpg');
    
    // 模拟图片加载失败
    mockImg.onerror();
    
    await expect(preloadPromise).rejects.toBeUndefined();
    
    const stats = ImageCache.getStats();
    expect(stats.cached).toBe(0);
  });
});

describe('useImagePreloader', () => {
  it('preloads images in batches', async () => {
    const { result } = renderHook(() => useImagePreloader());
    
    const urls = ['/img1.jpg', '/img2.jpg', '/img3.jpg'];
    
    // Mock successful preload
    vi.spyOn(ImageCache, 'preload').mockResolvedValue();
    
    await act(async () => {
      const stats = await result.current.preloadImagesInBatches(urls, 2, 0);
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(0);
    });
  });

  it('returns cache statistics', () => {
    const { result } = renderHook(() => useImagePreloader());
    
    vi.spyOn(ImageCache, 'getStats').mockReturnValue({
      cached: 5,
      preloading: 2
    });
    
    const stats = result.current.getCacheStats();
    expect(stats.cached).toBe(5);
    expect(stats.preloading).toBe(2);
  });

  it('clears cache when requested', () => {
    const { result } = renderHook(() => useImagePreloader());
    const clearSpy = vi.spyOn(ImageCache, 'clear');
    
    act(() => {
      result.current.clearCache();
    });
    
    expect(clearSpy).toHaveBeenCalled();
  });
});

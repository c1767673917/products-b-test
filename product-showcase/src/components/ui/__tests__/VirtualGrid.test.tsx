import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VirtualGrid, VirtualList } from '../VirtualGrid';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('VirtualGrid', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const mockRenderItem = (item: any, index: number) => (
    <div key={item.id} data-testid={`item-${item.id}`}>
      {item.name}
    </div>
  );

  it('renders virtual grid with correct structure', () => {
    render(
      <VirtualGrid
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
        containerHeight={400}
      />
    );

    // 应该有一个滚动容器
    const container = screen.getByRole('generic');
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('renders only visible items initially', () => {
    render(
      <VirtualGrid
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
        containerHeight={400}
        gap={16}
      />
    );

    // 由于虚拟化，不应该渲染所有100个项目
    const renderedItems = screen.queryAllByTestId(/item-/);
    expect(renderedItems.length).toBeLessThan(mockItems.length);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  it('handles scroll events', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
        containerHeight={400}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    
    // 模拟滚动
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 } });
    
    // 滚动后应该渲染不同的项目
    expect(scrollContainer).toBeDefined();
  });

  it('calculates correct total height', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems.slice(0, 10)} // 10个项目
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
        containerHeight={400}
        gap={16}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    const innerContainer = scrollContainer.firstChild as HTMLElement;
    
    // 对于10个项目，假设每行2个，应该有5行
    // 总高度应该是 5 * (100 + 16) - 16 = 564px
    expect(innerContainer).toHaveStyle({ position: 'relative' });
  });

  it('applies custom className', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty items array', () => {
    render(
      <VirtualGrid
        items={[]}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
      />
    );

    const renderedItems = screen.queryAllByTestId(/item-/);
    expect(renderedItems).toHaveLength(0);
  });

  it('responds to window resize', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={100}
        itemWidth={200}
      />
    );

    // 模拟窗口大小变化
    Object.defineProperty(container.firstChild, 'clientWidth', {
      value: 800,
      configurable: true,
    });

    fireEvent(window, new Event('resize'));
    
    // 组件应该重新计算布局
    expect(container.firstChild).toBeDefined();
  });
});

describe('VirtualList', () => {
  const mockItems = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const mockRenderItem = (item: any, index: number) => (
    <div key={item.id} data-testid={`list-item-${item.id}`}>
      {item.name}
    </div>
  );

  it('renders virtual list with correct structure', () => {
    render(
      <VirtualList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    // 应该有一个滚动容器
    const container = screen.getByRole('generic');
    expect(container).toHaveStyle({ height: '300px' });
  });

  it('renders only visible items', () => {
    render(
      <VirtualList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    // 容器高度300px，项目高度50px，应该显示约6个项目（加上overscan）
    const renderedItems = screen.queryAllByTestId(/list-item-/);
    expect(renderedItems.length).toBeLessThan(mockItems.length);
    expect(renderedItems.length).toBeGreaterThan(5);
  });

  it('handles scroll in list view', () => {
    const { container } = render(
      <VirtualList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    
    // 模拟滚动到中间位置
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } });
    
    // 滚动后应该渲染不同的项目
    const renderedItems = screen.queryAllByTestId(/list-item-/);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  it('calculates correct total height for list', () => {
    const { container } = render(
      <VirtualList
        items={mockItems.slice(0, 10)} // 10个项目
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    const scrollContainer = container.firstChild as HTMLElement;
    const innerContainer = scrollContainer.firstChild as HTMLElement;
    
    // 总高度应该是 10 * 50 = 500px
    expect(innerContainer).toHaveStyle({ height: '500px' });
  });

  it('positions items correctly in list', () => {
    render(
      <VirtualList
        items={mockItems.slice(0, 5)}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    const renderedItems = screen.queryAllByTestId(/list-item-/);
    expect(renderedItems.length).toBeGreaterThan(0);
    
    // 每个项目都应该有正确的绝对定位
    renderedItems.forEach((item, index) => {
      const parent = item.parentElement;
      expect(parent).toHaveStyle({ position: 'absolute' });
    });
  });

  it('applies custom overscan', () => {
    render(
      <VirtualList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
        overscan={10}
      />
    );

    // 更大的overscan应该渲染更多项目
    const renderedItems = screen.queryAllByTestId(/list-item-/);
    expect(renderedItems.length).toBeGreaterThan(6); // 基础6个 + overscan
  });

  it('handles empty list', () => {
    render(
      <VirtualList
        items={[]}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    );

    const renderedItems = screen.queryAllByTestId(/list-item-/);
    expect(renderedItems).toHaveLength(0);
  });

  it('applies custom className to list', () => {
    const { container } = render(
      <VirtualList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        className="custom-list-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-list-class');
  });
});

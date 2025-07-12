import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
    onPageChange: vi.fn(),
    onItemsPerPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pagination info correctly', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText(/显示第 1 - 20 项，共 200 项/)).toBeInTheDocument();
  });

  it('renders page numbers correctly', () => {
    render(<Pagination {...defaultProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onItemsPerPageChange when items per page is changed', () => {
    const onItemsPerPageChange = vi.fn();
    render(<Pagination {...defaultProps} onItemsPerPageChange={onItemsPerPageChange} />);
    
    const select = screen.getByDisplayValue('20');
    fireEvent.change(select, { target: { value: '100' } });
    expect(onItemsPerPageChange).toHaveBeenCalledWith(100);
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByText('上一页');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} totalPages={10} />);
    
    const nextButton = screen.getByText('下一页');
    expect(nextButton).toBeDisabled();
  });

  it('shows ellipsis for large page counts', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={20} />);
    
    const ellipsis = screen.getAllByRole('generic');
    expect(ellipsis.some(el => el.querySelector('svg'))).toBeTruthy();
  });

  it('does not render when totalPages is 1 and showItemsPerPageSelector is false', () => {
    const { container } = render(
      <Pagination 
        {...defaultProps} 
        totalPages={1} 
        showItemsPerPageSelector={false} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders items per page selector when enabled', () => {
    render(<Pagination {...defaultProps} showItemsPerPageSelector={true} />);
    
    expect(screen.getByText('每页显示')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('calculates display range correctly for middle pages', () => {
    render(
      <Pagination 
        {...defaultProps} 
        currentPage={5} 
        totalItems={200} 
        itemsPerPage={20} 
      />
    );
    
    expect(screen.getByText(/显示第 81 - 100 项，共 200 项/)).toBeInTheDocument();
  });

  it('calculates display range correctly for last page', () => {
    render(
      <Pagination 
        {...defaultProps} 
        currentPage={10} 
        totalPages={10}
        totalItems={195} 
        itemsPerPage={20} 
      />
    );
    
    expect(screen.getByText(/显示第 181 - 195 项，共 195 项/)).toBeInTheDocument();
  });
});

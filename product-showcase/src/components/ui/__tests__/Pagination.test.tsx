import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import Pagination from '../Pagination';

// Test wrapper with i18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 200,
    itemsPerPage: 20,
    onPageChange: vi.fn(),
    onItemsPerPageChange: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Set language to Chinese for consistent testing
    await i18n.changeLanguage('zh');
  });

  it('renders pagination info correctly', () => {
    renderWithI18n(<Pagination {...defaultProps} />);

    // Check for individual text parts since they are separate elements
    expect(screen.getByText('显示')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('到')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('共')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('项')).toBeInTheDocument();
  });

  it('renders page numbers correctly', () => {
    renderWithI18n(<Pagination {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = vi.fn();
    renderWithI18n(<Pagination {...defaultProps} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onItemsPerPageChange when items per page is changed', () => {
    const onItemsPerPageChange = vi.fn();
    renderWithI18n(<Pagination {...defaultProps} onItemsPerPageChange={onItemsPerPageChange} />);

    const select = screen.getByDisplayValue('20');
    fireEvent.change(select, { target: { value: '100' } });
    expect(onItemsPerPageChange).toHaveBeenCalledWith(100);
  });

  it('disables previous button on first page', () => {
    renderWithI18n(<Pagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByText('上一页');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderWithI18n(<Pagination {...defaultProps} currentPage={10} totalPages={10} />);

    const nextButton = screen.getByText('下一页');
    expect(nextButton).toBeDisabled();
  });

  it('shows ellipsis for large page counts', () => {
    renderWithI18n(<Pagination {...defaultProps} currentPage={5} totalPages={20} />);

    const ellipsis = screen.getAllByRole('generic');
    expect(ellipsis.some(el => el.querySelector('svg'))).toBeTruthy();
  });

  it('does not render when totalPages is 1 and showItemsPerPageSelector is false', () => {
    const { container } = renderWithI18n(
      <Pagination
        {...defaultProps}
        totalPages={1}
        showItemsPerPageSelector={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders items per page selector when enabled', () => {
    renderWithI18n(<Pagination {...defaultProps} showItemsPerPageSelector={true} />);

    expect(screen.getByText('每页显示 条')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('calculates display range correctly for middle pages', () => {
    renderWithI18n(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalItems={200}
        itemsPerPage={20}
      />
    );

    // Check for individual text parts
    expect(screen.getByText('显示')).toBeInTheDocument();
    expect(screen.getByText('81')).toBeInTheDocument();
    expect(screen.getByText('到')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('共')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('calculates display range correctly for last page', () => {
    renderWithI18n(
      <Pagination
        {...defaultProps}
        currentPage={10}
        totalPages={10}
        totalItems={195}
        itemsPerPage={20}
      />
    );

    // Check for individual text parts
    expect(screen.getByText('显示')).toBeInTheDocument();
    expect(screen.getByText('181')).toBeInTheDocument();
    expect(screen.getByText('到')).toBeInTheDocument();
    expect(screen.getByText('195')).toBeInTheDocument();
    expect(screen.getByText('共')).toBeInTheDocument();
    expect(screen.getByText('195')).toBeInTheDocument();
  });

  it('renders in English when language is switched', async () => {
    await i18n.changeLanguage('en');

    renderWithI18n(<Pagination {...defaultProps} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Last')).toBeInTheDocument();
    expect(screen.getByText('items per page')).toBeInTheDocument();

    // Check for individual text parts in English
    expect(screen.getByText('Showing')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('of')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
  });
});

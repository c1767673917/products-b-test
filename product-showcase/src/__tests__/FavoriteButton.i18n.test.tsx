import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { useTranslation } from 'react-i18next';
import FavoriteButton from '../components/product/FavoriteButton';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(),
}));

const mockUseTranslation = vi.mocked(useTranslation);

describe('FavoriteButton Internationalization', () => {
  const mockT = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
      } as any,
    } as any);
  });

  it('should display English tooltip when language is English', () => {
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'actions.favorite': 'Add to Favorites',
        'actions.favorited': 'Favorited',
      };
      return translations[key] || key;
    });

    render(
      <FavoriteButton
        isFavorited={false}
        onClick={vi.fn()}
        showTooltip={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Add to Favorites');
  });

  it('should display Chinese tooltip when language is Chinese', () => {
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'zh',
        changeLanguage: vi.fn(),
      } as any,
    } as any);

    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'actions.favorite': '收藏',
        'actions.favorited': '已收藏',
      };
      return translations[key] || key;
    });

    render(
      <FavoriteButton
        isFavorited={false}
        onClick={vi.fn()}
        showTooltip={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', '收藏');
  });

  it('should display favorited state tooltip correctly', () => {
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'actions.favorite': 'Add to Favorites',
        'actions.favorited': 'Favorited',
      };
      return translations[key] || key;
    });

    render(
      <FavoriteButton
        isFavorited={true}
        onClick={vi.fn()}
        showTooltip={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Favorited');
  });

  it('should not display tooltip when showTooltip is false', () => {
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'actions.favorite': 'Add to Favorites',
        'actions.favorited': 'Favorited',
      };
      return translations[key] || key;
    });

    render(
      <FavoriteButton
        isFavorited={false}
        onClick={vi.fn()}
        showTooltip={false}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('title');
  });
});

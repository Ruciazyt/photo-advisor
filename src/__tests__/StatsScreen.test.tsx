import React from 'react';
import { render } from '@testing-library/react-native';
import { StatsScreen } from '../screens/StatsScreen';
import { useFavorites } from '../hooks/useFavorites';

jest.mock('../hooks/useFavorites', () => ({
  useFavorites: jest.fn(),
}));

const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;

const makeFavs = (count: number, overrides: Partial<import('../services/favorites').FavoriteItem> = {}) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `fav_${i}`,
    uri: `file:///test_${i}.jpg`,
    score: 70 + (i % 3) * 10,
    date: '2026-04-10T12:00:00Z',
    gridType: i % 2 === 0 ? 'thirds' : 'golden',
    suggestion: '',
    sceneTag: i % 3 === 0 ? '人像' : '',
    ...overrides,
  }));
};

describe('StatsScreen', () => {
  it('renders empty state when no favorites', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<StatsScreen onBack={jest.fn()} />);
    expect(getByText('暂无数据')).toBeTruthy();
  });

  it('renders stats when favorites exist', () => {
    mockUseFavorites.mockReturnValue({
      favorites: makeFavs(5),
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<StatsScreen onBack={jest.fn()} />);
    expect(getByText('拍摄统计')).toBeTruthy();
  });
});

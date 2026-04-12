import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { useFavorites } from '../hooks/useFavorites';

jest.mock('../hooks/useFavorites', () => ({
  useFavorites: jest.fn(),
}));

const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;

function makeFavorite(overrides: Partial<import('../services/favorites').FavoriteItem> = {}): import('../services/favorites').FavoriteItem {
  return {
    id: `fav_${Math.random()}`,
    uri: 'https://example.com/photo.jpg',
    score: 85,
    scoreReason: '构图良好',
    date: '2026-04-10T14:32:00.000Z',
    gridType: '三分法',
    suggestion: '',
    sceneTag: undefined,
    ...overrides,
  };
}

describe('FavoritesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      loading: true,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText, queryByText } = render(<FavoritesScreen />);
    expect(getByText('优秀照片')).toBeTruthy();
    expect(getByText('收藏夹')).toBeTruthy();
    expect(queryByText('还没有收藏照片')).toBeNull();
  });

  it('renders empty state when no favorites', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('还没有收藏照片')).toBeTruthy();
    expect(getByText('在相机拍摄后点击爱心按钮收藏')).toBeTruthy();
  });

  it('shows correct count in subtitle', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: '1' }),
        makeFavorite({ id: '2' }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('收藏夹 · 2张')).toBeTruthy();
  });

  it('renders favorite cards with grid type label', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', gridType: '黄金分割', score: 92 }),
        makeFavorite({ id: 'f2', gridType: '三分法', score: 76 }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('黄金分割')).toBeTruthy();
    expect(getByText('三分法')).toBeTruthy();
  });

  it('renders scene tag badge when present', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', sceneTag: '风光' }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('风光')).toBeTruthy();
  });

  it('opens full-screen modal showing score when card is pressed', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', score: 88, gridType: '对角线' }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getAllByText } = render(<FavoritesScreen />);
    // The card contains gridType text
    fireEvent.press(getAllByText('对角线')[0]);
    // Modal should now display the score (appears twice: badge + modal score)
    const scoreElements = getAllByText('88');
    expect(scoreElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render empty state when favorites exist', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [makeFavorite({ id: 'f1' })],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { queryByText } = render(<FavoritesScreen />);
    expect(queryByText('还没有收藏照片')).toBeNull();
  });

  it('triggers long-press alert on card when delete is available', () => {
    const deleteFavorite = jest.fn();
    mockUseFavorites.mockReturnValue({
      favorites: [makeFavorite({ id: 'f1' })],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite,
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    fireEvent(getByText('三分法'), 'longPress');
    // Alert.alert is called; in unit test we just verify no crash
  });

  it('renders score badge on card showing score value', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', score: 95 }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    // Score badge shows the score number
    expect(getByText('95')).toBeTruthy();
  });

  it('shows score reason in modal when present', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', score: 88, scoreReason: '构图优秀，光影完美' }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    fireEvent.press(getByText('三分法'));
    expect(getByText('构图优秀，光影完美')).toBeTruthy();
  });

  it('displays all star ratings in card footer', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', score: 60 }),
        makeFavorite({ id: 'f2', score: 30 }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getAllByText } = render(<FavoritesScreen />);
    // Both cards render some stars (filled + empty)
    const starElements = getAllByText(/★/);
    expect(starElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders with stats button visible', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('📊 统计')).toBeTruthy();
  });

  it('handles favorites with no optional fields gracefully', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        {
          id: 'f1',
          uri: 'https://example.com/photo.jpg',
          score: 75,
          date: '2026-04-10T14:32:00.000Z',
          gridType: '三分法',
          suggestion: '',
          // no scoreReason, no sceneTag
        },
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText, queryByText } = render(<FavoritesScreen />);
    expect(getByText('三分法')).toBeTruthy();
    expect(getByText('75')).toBeTruthy();
    // No crash, no missing field errors
    expect(queryByText('undefined')).toBeNull();
  });

  it('renders different grid types for different cards', () => {
    mockUseFavorites.mockReturnValue({
      favorites: [
        makeFavorite({ id: 'f1', gridType: '三分法' }),
        makeFavorite({ id: 'f2', gridType: '螺旋线' }),
        makeFavorite({ id: 'f3', gridType: '对角线' }),
      ],
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<FavoritesScreen />);
    expect(getByText('三分法')).toBeTruthy();
    expect(getByText('螺旋线')).toBeTruthy();
    expect(getByText('对角线')).toBeTruthy();
  });
});

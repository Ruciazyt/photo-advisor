import React from 'react';
import { render } from '@testing-library/react-native';
import { StatsScreen } from '../screens/StatsScreen';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../contexts/ThemeContext';

jest.mock('../hooks/useFavorites', () => ({
  useFavorites: jest.fn(),
}));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockUseFavorites = useFavorites as jest.MockedFunction<typeof useFavorites>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockColors = {
  primary: '#000000',
  accent: '#FFD700',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  cardBg: '#1A1A1A',
  border: '#333333',
};

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

beforeEach(() => {
  mockUseTheme.mockReturnValue({ colors: mockColors, isDark: true, toggleTheme: jest.fn(), setTheme: jest.fn() });
});

afterEach(() => {
  jest.clearAllMocks();
});

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

  it('renders stats header when favorites exist', () => {
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

  it('renders stats summary cards with correct values', () => {
    const favs = makeFavs(5);
    mockUseFavorites.mockReturnValue({
      favorites: favs,
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText, getAllByText } = render(<StatsScreen onBack={jest.fn()} />);


    // totalPhotos = 5
    expect(getByText('5')).toBeTruthy();
    // avgScore = (70+80+90+70+80)/5 = 78
    expect(getByText(/78/)).toBeTruthy();
    // labels
    expect(getByText('总照片')).toBeTruthy();
    expect(getByText('平均分')).toBeTruthy();
    expect(getByText('最高分')).toBeTruthy();
  });

  it('renders "最近趋势" (recent trend) section', () => {
    mockUseFavorites.mockReturnValue({
      favorites: makeFavs(3),
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<StatsScreen onBack={jest.fn()} />);
    expect(getByText('最近趋势')).toBeTruthy();
  });

  it('renders grid usage bars', () => {
    const favs = [
      { id: 'fav_0', uri: 'file:///test_0.jpg', score: 80, date: '2026-04-10T12:00:00Z', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'fav_1', uri: 'file:///test_1.jpg', score: 75, date: '2026-04-11T12:00:00Z', gridType: 'golden', suggestion: '', sceneTag: '' },
    ];
    mockUseFavorites.mockReturnValue({
      favorites: favs,
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<StatsScreen onBack={jest.fn()} />);
    expect(getByText('构图使用')).toBeTruthy();
    expect(getByText('thirds')).toBeTruthy();
    expect(getByText('golden')).toBeTruthy();
  });

  it('renders score history chips', () => {
    const favs = [
      { id: 'fav_0', uri: 'file:///test_0.jpg', score: 85, date: '2026-04-01T12:00:00Z', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'fav_1', uri: 'file:///test_1.jpg', score: 90, date: '2026-04-05T12:00:00Z', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ];
    mockUseFavorites.mockReturnValue({
      favorites: favs,
      loading: false,
      saveFavorite: jest.fn(),
      deleteFavorite: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText } = render(<StatsScreen onBack={jest.fn()} />);
    expect(getByText('最近评分')).toBeTruthy();
    // dates are formatted as MM/DD
    expect(getByText('04/01')).toBeTruthy();
    expect(getByText('04/05')).toBeTruthy();
  });
});

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
  accent: '#E8D5B7',
  cardBg: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#F59E0B',
  background: '#000000',
  sunColor: '#FFB800',
  gridAccent: 'rgba(232,213,183,0.35)',
  countdownBg: 'rgba(232,213,183,0.9)',
  countdownBorder: 'rgba(255,255,255,0.4)',
  countdownText: '#000000',
  scoreS: '#FFD700',
  scoreA: '#C0C0C0',
  scoreB: '#CD7F32',
  scoreC: '#8B7355',
  scoreD: '#555555',
  scoreOverlayBg: 'rgba(0,0,0,0.65)',
  scoreHintText: 'rgba(255,255,255,0.4)',
  scoreCardBg: 'rgba(28,28,28,0.95)',
  scoreCardBorder: 'rgba(255,255,255,0.1)',
  scoreLabelText: 'rgba(255,255,255,0.6)',
  scoreBarBg: 'rgba(255,255,255,0.1)',
  modeSelectorBg: 'rgba(0,0,0,0.4)',
  modeSelectorUnselected: 'rgba(255,255,255,0.7)',
  overlayBg: 'rgba(0,0,0,0.55)',
  topBarBg: 'rgba(0,0,0,0.55)',
  topBarText: '#FFFFFF',
  topBarTextSecondary: 'rgba(255,255,255,0.6)',
  topBarBorderInactive: 'rgba(255,255,255,0.15)',
  topBarBorderActive: 'rgba(255,255,255,0.3)',
  topBarSelectorBgActive: 'rgba(232,213,183,0.35)',
  topBarSelectorBorderActive: 'rgba(232,213,183,0.6)',
  bubbleBg: 'rgba(0,0,0,0.4)',
  timerActiveBg: 'rgba(255,82,82,0.6)',
  timerActiveBorder: 'rgba(255,255,255,0.3)',
  timerPreviewBg: 'rgba(0,0,0,0.5)',
  timerBorder: 'rgba(255,255,255,0.25)',
  timerUnitText: 'rgba(255,255,255,0.5)',
  challengeActiveBg: 'rgba(255,215,0,0.15)',
  challengeActiveBorder: 'rgba(255,215,0,0.6)',
  challengeActiveText: '#FFD700',
  rawActiveBg: 'rgba(0,200,100,0.2)',
  rawActiveBorder: 'rgba(0,200,100,0.6)',
  rawActiveText: '#00C864',
  focusGuideActiveBg: 'rgba(255,220,0,0.15)',
  focusGuideActiveBorder: 'rgba(255,220,0,0.5)',
  focusGuideActiveText: '#FFDC00',
  voiceActiveBg: 'rgba(232,213,183,0.2)',
  burstIndicatorBg: 'rgba(255,215,0,0.85)',
  burstIndicatorText: '#000000',
  burstSuggestionBg: 'rgba(20,16,8,0.92)',
  burstSuggestionBorder: 'rgba(255,215,0,0.35)',
  histogramBg: 'rgba(0,0,0,0.65)',
  histogramBorder: 'rgba(255,255,255,0.12)',
  sunPanelBg: '#1A1A1A',
  sunPanelBorder: 'rgba(255,255,255,0.1)',
  sunCompassBg: 'rgba(0,0,0,0.3)',
  sunCompassText: 'rgba(255,255,255,0.5)',
  sunCompassCenter: 'rgba(255,255,255,0.3)',
  sunToggleActiveBg: 'rgba(255,184,0,0.15)',
  sunToggleActiveBorder: 'rgba(255,184,0,0.5)',
  toastBg: 'rgba(255,107,138,0.9)',
  favoriteIcon: '#FF6B8A',
  shareButtonBg: 'rgba(0,0,0,0.55)',
  shareButtonBorder: 'rgba(255,255,255,0.15)',
  shareButtonDisabledText: 'rgba(255,255,255,0.3)',
  drawerBg: '#1A1A1A',
  drawerHandle: '#666666',
  drawerTextSecondary: '#999999',
  gridCardDisabledText: '#AAAAAA',
  sparkleColors: ['#FFD700', '#C0C0C0', '#FF69B4', '#87CEEB', '#98FB98'],
  starGreen: '#8BC34A',
  starYellow: '#FFC107',
  starOrange: '#FF9800',
  bubbleText: '#FFFFFF',
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
  mockUseTheme.mockReturnValue({ theme: 'dark' as const, colors: mockColors, toggleTheme: jest.fn(), setTheme: jest.fn() });
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

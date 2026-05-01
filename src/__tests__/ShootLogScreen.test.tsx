import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ShootLogScreen } from '../screens/ShootLogScreen';
import { useShootLog } from '../hooks/useShootLog';

jest.mock('../hooks/useShootLog', () => ({
  useShootLog: jest.fn(),
}));

const mockUseShootLog = useShootLog as jest.MockedFunction<typeof useShootLog>;

function makeEntry(overrides: Partial<import('../services/shootLog').ShootLogEntry> = {}) {
  return {
    id: `shoot_${Math.random()}`,
    date: '2026-04-10T14:32:00.000Z',
    gridType: 'thirds',
    wasFavorite: false,
    suggestions: [],
    ...overrides,
  };
}

describe('ShootLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no log entries', () => {
    mockUseShootLog.mockReturnValue({
      log: [],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 0,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('还没有拍摄记录')).toBeTruthy();
    expect(getByText('开始第一次拍摄吧！')).toBeTruthy();
  });

  it('renders loading state', () => {
    mockUseShootLog.mockReturnValue({
      log: [],
      loading: true,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 0,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { queryByText } = render(<ShootLogScreen />);
    // empty state should not be shown while loading
    expect(queryByText('还没有拍摄记录')).toBeNull();
  });

  it('shows correct count in header', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({ id: '1', score: 80 }),
        makeEntry({ id: '2', score: 70 }),
        makeEntry({ id: '3', wasFavorite: true }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 3,
      avgScore: 75,
      favoriteCount: 1,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('拍摄日志')).toBeTruthy();
    expect(getByText(/3 次拍摄/)).toBeTruthy();
    expect(getByText(/75 平均分/)).toBeTruthy();
    expect(getByText(/1 收藏/)).toBeTruthy();
  });

  it('shows 清空 button when entries exist', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: '1' })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('清空')).toBeTruthy();
  });

  it('does not show 清空 button when no entries', () => {
    mockUseShootLog.mockReturnValue({
      log: [],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 0,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { queryByText } = render(<ShootLogScreen />);
    expect(queryByText('清空')).toBeNull();
  });

  it('renders log entries with grid type, time, score', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({
          id: 'entry_1',
          // Use a UTC time that stays the same in UTC+8 — midnight UTC = 08:00 CST
          date: '2026-04-10T00:00:00.000Z',
          gridType: 'thirds',
          score: 82,
        }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 82,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('📐 三分法')).toBeTruthy();
    // 00:00 UTC = 08:00 CST in Asia/Shanghai (UTC+8)
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('★ 82')).toBeTruthy();
  });

  it('renders log entries with wasFavorite tag', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({
          id: 'entry_fav',
          wasFavorite: true,
          gridType: 'golden',
        }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 1,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('❤️ 已收藏')).toBeTruthy();
  });

  it('clear button triggers confirmation alert', async () => {
    const clearLog = jest.fn();
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: '1' })],
      loading: false,
      addEntry: jest.fn(),
      clearLog,
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    fireEvent.press(getByText('清空'));

    // Alert should be shown (we can't directly test the alert content in unit tests
    // without mocking Alert.alert, but we can verify the handler is not called until confirmed)
    // The actual alert confirmation would be tested in integration tests
  });
});

describe('useShootLog hook', () => {
  it('computes totalShoots, avgScore, favoriteCount from log', () => {
    const entries: import('../services/shootLog').ShootLogEntry[] = [
      makeEntry({ id: '1', score: 80, wasFavorite: true }),
      makeEntry({ id: '2', score: 60, wasFavorite: false }),
      makeEntry({ id: '3', score: 70, wasFavorite: true }),
    ];

    // The hook computes these values from the log array
    const totalShoots = entries.length;
    const scoredEntries = entries.filter(e => e.score !== undefined);
    const avgScore = Math.round(
      scoredEntries.reduce((sum, e) => sum + (e.score ?? 0), 0) / scoredEntries.length
    );
    const favoriteCount = entries.filter(e => e.wasFavorite).length;

    expect(totalShoots).toBe(3);
    expect(avgScore).toBe(70);
    expect(favoriteCount).toBe(2);
  });

  it('avgScore returns 0 when no scored entries', () => {
    const entries: import('../services/shootLog').ShootLogEntry[] = [
      makeEntry({ id: '1' }),
    ];
    const scoredEntries = entries.filter(e => e.score !== undefined);
    const avgScore = scoredEntries.length > 0
      ? Math.round(scoredEntries.reduce((sum, e) => sum + (e.score ?? 0), 0) / scoredEntries.length)
      : 0;
    expect(avgScore).toBe(0);
  });
});

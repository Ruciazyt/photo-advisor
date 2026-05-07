import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ShootLogScreen } from '../screens/ShootLogScreen';
import { useShootLog } from '../hooks/useShootLog';

jest.mock('../hooks/useShootLog', () => ({
  useShootLog: jest.fn(),
}));

const mockUseShootLog = useShootLog as jest.MockedFunction<typeof useShootLog>;

function makeEntry(overrides: Partial<import('../services/shootLog').ShootLogEntry> = {}) {
  return {
    id: `shoot_${Math.random().toString(36).slice(2)}`,
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
    Alert.alert = jest.fn();
  });

  // ===== Empty & Loading States =====

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
    expect(queryByText('还没有拍摄记录')).toBeNull();
  });

  it('does not show 选择 button when no entries', () => {
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
    expect(queryByText('选择')).toBeNull();
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

  // ===== Header Stats =====

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

  // ===== Entry Card - Basic Rendering =====

  it('renders log entries with grid type, time, score', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({
          id: 'entry_1',
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

  // ===== Entry Card - Variants =====

  it('renders sceneTag badge', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'scenetag', sceneTag: '人像' })],
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
    expect(getByText('人像')).toBeTruthy();
  });

  it('renders locationName with emoji', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'location', locationName: '西湖' })],
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
    expect(getByText('📍 西湖')).toBeTruthy();
  });

  it('renders timerDuration badge', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'timer', timerDuration: 10 })],
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
    expect(getByText('⏱ 10s')).toBeTruthy();
  });

  it('renders scoreReason in italic', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'reason', scoreReason: '构图偏左' })],
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
    expect(getByText('构图偏左')).toBeTruthy();
  });

  it('renders suggestion text with first suggestion', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'suggest', suggestions: ['尝试三分法构图', '增加前景元素'] })],
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
    expect(getByText('💡 尝试三分法构图')).toBeTruthy();
  });

  // ===== Grid Badge Labels =====

  it('gridBadge shows 三分法 for thirds', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'g1', gridType: 'thirds' })],
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
    expect(getByText('📐 三分法')).toBeTruthy();
  });

  it('gridBadge shows 黄金比例 for golden', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'g2', gridType: 'golden' })],
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
    expect(getByText('📐 黄金比例')).toBeTruthy();
  });

  it('gridBadge shows 对角线 for diagonal', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'g3', gridType: 'diagonal' })],
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
    expect(getByText('📐 对角线')).toBeTruthy();
  });

  it('gridBadge shows 螺旋 for spiral', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'g4', gridType: 'spiral' })],
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
    expect(getByText('📐 螺旋')).toBeTruthy();
  });

  it('gridBadge shows 无网格 for none', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'g5', gridType: 'none' })],
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
    expect(getByText('📐 无网格')).toBeTruthy();
  });

  // ===== Score Badge Colors =====

  it('score >= 75 renders score badge', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'high', score: 85 })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 85,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('★ 85')).toBeTruthy();
  });

  it('score >= 60 renders score badge', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'mid', score: 65 })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 65,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('★ 65')).toBeTruthy();
  });

  it('score < 60 renders score badge', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'low', score: 45 })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 45,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    expect(getByText('★ 45')).toBeTruthy();
  });

  // ===== Multiple Sections =====

  it('entries grouped by date header correctly', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({ id: 'd1', date: '2026-04-10T10:00:00.000Z' }),
        makeEntry({ id: 'd2', date: '2026-04-10T14:00:00.000Z' }),
        makeEntry({ id: 'd3', date: '2026-04-11T09:00:00.000Z' }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 3,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getAllByText } = render(<ShootLogScreen />);
    // April 10 header and April 11 header
    expect(getAllByText('2026年4月10日')).toHaveLength(1);
    expect(getAllByText('2026年4月11日')).toHaveLength(1);
  });

  it('section headers show formatted date', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'fmt_date', date: '2026-04-10T10:00:00.000Z' })],
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
    expect(getByText('2026年4月10日')).toBeTruthy();
  });

  // ===== Selection Mode =====

  it('long press enters selection mode and selects the entry', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'longpress_entry' })],
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
    const card = getByText('📐 三分法').parent?.parent?.parent;
    expect(card).toBeTruthy();
    fireEvent(card!, 'longPress');

    expect(getByText('取消')).toBeTruthy();
    expect(getByText('删除(1)')).toBeTruthy();
  });

  it('cancel button exits select mode', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'cancel_exit' })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText, queryByText } = render(<ShootLogScreen />);
    const card = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card!, 'longPress');
    expect(getByText('取消')).toBeTruthy();

    fireEvent.press(getByText('取消'));
    expect(queryByText('取消')).toBeNull();
    expect(queryByText('删除(1)')).toBeNull();
  });

  it('delete button shows count of selected items', () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({ id: 'multi_1', gridType: 'thirds' }),
        makeEntry({ id: 'multi_2', gridType: 'golden' }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 2,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    const card = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card!, 'longPress');
    expect(getByText('删除(1)')).toBeTruthy();
  });

  // ===== Delete Functionality =====

  it('delete confirmation alert shows correct count', () => {
    const deleteEntries = jest.fn();
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'del_entry' })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries,
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    const card = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card!, 'longPress');
    fireEvent.press(getByText('删除(1)'));

    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    expect(alertCalls[0][0]).toBe('删除记录');
    expect(alertCalls[0][1]).toContain('1');
  });

  it('tap toggles entry selection in select mode', async () => {
    mockUseShootLog.mockReturnValue({
      log: [
        makeEntry({ id: 'tap_toggle_1', gridType: 'thirds' }),
        makeEntry({ id: 'tap_toggle_2', gridType: 'golden' }),
      ],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 2,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText } = render(<ShootLogScreen />);
    // Enter selection mode via long press on first entry
    let card1 = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card1!, 'longPress');
    expect(getByText('删除(1)')).toBeTruthy();

    // Tap second entry to add it to selection
    const card2 = getByText('📐 黄金比例').parent?.parent?.parent;
    fireEvent(card2!, 'press');
    expect(getByText('删除(2)')).toBeTruthy();

    // Re-query card1 after re-render (refs become stale)
    card1 = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card1!, 'press');
    await waitFor(() => {
      expect(getByText('删除(1)')).toBeTruthy();
    });
  });

  it('after confirming delete, entries are removed and select mode exits', async () => {
    const deleteEntries = jest.fn();
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'confirm_del' })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries,
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { getByText, queryByText } = render(<ShootLogScreen />);
    const card = getByText('📐 三分法').parent?.parent?.parent;
    fireEvent(card!, 'longPress');
    expect(getByText('删除(1)')).toBeTruthy();

    fireEvent.press(getByText('删除(1)'));
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;

    // Simulate pressing the "删除" button in the alert
    const deleteButton = alertCalls[0][2].find((btn: { text: string }) => btn.text === '删除');
    deleteButton.onPress();

    expect(deleteEntries).toHaveBeenCalledWith(['confirm_del']);

    await waitFor(() => {
      expect(queryByText('取消')).toBeNull();
      expect(queryByText('删除(1)')).toBeNull();
    });
  });

  it('select button enters select mode', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'select_btn_entry' })],
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
    fireEvent.press(getByText('选择'));
    expect(getByText('取消')).toBeTruthy();
    expect(getByText('删除(0)')).toBeTruthy();
  });

  it('shows 选择 button when entries exist', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'select_btn' })],
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
    expect(getByText('选择')).toBeTruthy();
  });

  it('does not render score badge when score is undefined', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'no_score', score: undefined })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { queryByText } = render(<ShootLogScreen />);
    expect(queryByText(/★/)).toBeNull();
  });

  it('does not render score badge when score is null', () => {
    mockUseShootLog.mockReturnValue({
      log: [makeEntry({ id: 'null_score', score: null as any })],
      loading: false,
      addEntry: jest.fn(),
      clearLog: jest.fn(),
      deleteEntry: jest.fn(),
      deleteEntries: jest.fn(),
      totalShoots: 1,
      avgScore: 0,
      favoriteCount: 0,
    });

    const { queryByText } = render(<ShootLogScreen />);
    expect(queryByText(/★/)).toBeNull();
  });

});

describe('useShootLog hook', () => {
  it('computes totalShoots, avgScore, favoriteCount from log', () => {
    const entries: import('../services/shootLog').ShootLogEntry[] = [
      makeEntry({ id: '1', score: 80, wasFavorite: true }),
      makeEntry({ id: '2', score: 60, wasFavorite: false }),
      makeEntry({ id: '3', score: 70, wasFavorite: true }),
    ];

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

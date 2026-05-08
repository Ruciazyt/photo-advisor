import {
  computeStats,
  getScoreEmoji,
  getTrendLabel,
} from '../services/stats';
import type { FavoriteItem } from '../services/favorites';

function makeFavorite(overrides: Partial<FavoriteItem> = {}): FavoriteItem {
  return {
    id: `fav_${Math.random()}`,
    uri: 'file:///test.jpg',
    score: 80,
    date: '2026-04-10T12:00:00Z',
    gridType: 'thirds',
    suggestion: '',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('returns empty stats for empty array', () => {
    const result = computeStats([]);
    expect(result.totalPhotos).toBe(0);
    expect(result.avgScore).toBe(0);
    expect(result.gridUsages).toEqual([]);
  });

  it('computes totalPhotos correctly', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80 }),
      makeFavorite({ id: '2', score: 70 }),
    ];
    expect(computeStats(favs).totalPhotos).toBe(2);
  });

  it('computes avgScore correctly', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80 }),
      makeFavorite({ id: '2', score: 60 }),
    ];
    expect(computeStats(favs).avgScore).toBe(70);
  });

  it('finds bestScore as max', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80 }),
      makeFavorite({ id: '2', score: 95 }),
      makeFavorite({ id: '3', score: 60 }),
    ];
    expect(computeStats(favs).bestScore).toBe(95);
  });

  it('finds mostUsedGrid as mode', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80, gridType: 'thirds' }),
      makeFavorite({ id: '2', score: 70, gridType: 'thirds' }),
      makeFavorite({ id: '3', score: 60, gridType: 'golden' }),
    ];
    expect(computeStats(favs).mostUsedGrid).toBe('thirds');
  });

  it('computes gridUsages with percentage', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80, gridType: 'thirds' }),
      makeFavorite({ id: '2', score: 70, gridType: 'thirds' }),
      makeFavorite({ id: '3', score: 60, gridType: 'golden' }),
    ];
    const result = computeStats(favs);
    expect(result.gridUsages).toHaveLength(2);
    const thirdsUsage = result.gridUsages.find(g => g.gridType === 'thirds')!;
    expect(thirdsUsage.count).toBe(2);
    expect(thirdsUsage.avgScore).toBe(75);
    expect(thirdsUsage.percentage).toBeCloseTo(66.67);
  });

  it('computes sceneUsages excluding empty tags', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80, sceneTag: '人像' }),
      makeFavorite({ id: '2', score: 70, sceneTag: '人像' }),
      makeFavorite({ id: '3', score: 60 }),
    ];
    const result = computeStats(favs);
    expect(result.sceneUsages).toHaveLength(1);
    expect(result.sceneUsages[0].sceneTag).toBe('人像');
  });

  it('computes monthlyStats sorted descending', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80, date: '2026-04-10T10:00:00Z' }),
      makeFavorite({ id: '2', score: 70, date: '2026-04-15T10:00:00Z' }),
      makeFavorite({ id: '3', score: 60, date: '2026-03-20T10:00:00Z' }),
    ];
    const result = computeStats(favs);
    expect(result.monthlyStats[0].month).toBe('2026-04');
    expect(result.monthlyStats[0].count).toBe(2);
    expect(result.monthlyStats[1].month).toBe('2026-03');
  });

  it('returns stable trend for fewer than 10 photos', () => {
    const favs = [
      makeFavorite({ id: '1', score: 80 }),
      makeFavorite({ id: '2', score: 60 }),
    ];
    expect(computeStats(favs).recentTrend).toBe('stable');
  });

  it('detects upward trend when recent scores much higher', () => {
    // 10+ photos needed for trend
    const favs = [
      makeFavorite({ id: '1', score: 30, date: '2026-04-01T10:00:00Z' }),
      makeFavorite({ id: '2', score: 30, date: '2026-04-02T10:00:00Z' }),
      makeFavorite({ id: '3', score: 30, date: '2026-04-03T10:00:00Z' }),
      makeFavorite({ id: '4', score: 30, date: '2026-04-04T10:00:00Z' }),
      makeFavorite({ id: '5', score: 30, date: '2026-04-05T10:00:00Z' }),
      makeFavorite({ id: '6', score: 30, date: '2026-04-06T10:00:00Z' }),
      makeFavorite({ id: '7', score: 30, date: '2026-04-07T10:00:00Z' }),
      makeFavorite({ id: '8', score: 30, date: '2026-04-08T10:00:00Z' }),
      makeFavorite({ id: '9', score: 30, date: '2026-04-09T10:00:00Z' }),
      makeFavorite({ id: '10', score: 30, date: '2026-04-10T10:00:00Z' }),
      makeFavorite({ id: '11', score: 90, date: '2026-04-11T10:00:00Z' }),
      makeFavorite({ id: '12', score: 90, date: '2026-04-12T10:00:00Z' }),
      makeFavorite({ id: '13', score: 90, date: '2026-04-13T10:00:00Z' }),
      makeFavorite({ id: '14', score: 90, date: '2026-04-14T10:00:00Z' }),
      makeFavorite({ id: '15', score: 90, date: '2026-04-15T10:00:00Z' }),
    ];
    expect(computeStats(favs).recentTrend).toBe('up');
  });

  it('detects downward trend when recent scores much lower', () => {
    // Recent 5 avg = 30, prev 5 avg = 90, diff = -60 < -3 → down
    const favs = [
      makeFavorite({ id: '1', score: 90, date: '2026-04-01T10:00:00Z' }),
      makeFavorite({ id: '2', score: 90, date: '2026-04-02T10:00:00Z' }),
      makeFavorite({ id: '3', score: 90, date: '2026-04-03T10:00:00Z' }),
      makeFavorite({ id: '4', score: 90, date: '2026-04-04T10:00:00Z' }),
      makeFavorite({ id: '5', score: 90, date: '2026-04-05T10:00:00Z' }),
      makeFavorite({ id: '6', score: 90, date: '2026-04-06T10:00:00Z' }),
      makeFavorite({ id: '7', score: 90, date: '2026-04-07T10:00:00Z' }),
      makeFavorite({ id: '8', score: 90, date: '2026-04-08T10:00:00Z' }),
      makeFavorite({ id: '9', score: 90, date: '2026-04-09T10:00:00Z' }),
      makeFavorite({ id: '10', score: 90, date: '2026-04-10T10:00:00Z' }),
      makeFavorite({ id: '11', score: 30, date: '2026-04-11T10:00:00Z' }),
      makeFavorite({ id: '12', score: 30, date: '2026-04-12T10:00:00Z' }),
      makeFavorite({ id: '13', score: 30, date: '2026-04-13T10:00:00Z' }),
      makeFavorite({ id: '14', score: 30, date: '2026-04-14T10:00:00Z' }),
      makeFavorite({ id: '15', score: 30, date: '2026-04-15T10:00:00Z' }),
    ];
    expect(computeStats(favs).recentTrend).toBe('down');
  });
});

describe('getScoreEmoji', () => {
  it('returns 🏆 for score >= 90', () => {
    expect(getScoreEmoji(90)).toBe('🏆');
    expect(getScoreEmoji(100)).toBe('🏆');
  });
  it('returns 🌟 for score 75-89', () => {
    expect(getScoreEmoji(75)).toBe('🌟');
    expect(getScoreEmoji(89)).toBe('🌟');
  });
  it('returns 👍 for score 60-74', () => {
    expect(getScoreEmoji(60)).toBe('👍');
    expect(getScoreEmoji(74)).toBe('👍');
  });
  it('returns 😐 for score 40-59', () => {
    expect(getScoreEmoji(40)).toBe('😐');
    expect(getScoreEmoji(59)).toBe('😐');
  });
  it('returns 💪 for score < 40', () => {
    expect(getScoreEmoji(39)).toBe('💪');
    expect(getScoreEmoji(0)).toBe('💪');
  });
});

describe('getTrendLabel', () => {
  it('returns 上升 📈 for up trend', () => {
    expect(getTrendLabel('up')).toBe('上升 📈');
  });
  it('returns 下降 📉 for down trend', () => {
    expect(getTrendLabel('down')).toBe('下降 📉');
  });
  it('returns 稳定 for stable trend', () => {
    expect(getTrendLabel('stable')).toBe('稳定');
  });
});

/**
 * Tests for stats service — statistics computation from favorites.
 */

import type { FavoriteItem } from '../../types';
import { computeStats, getScoreEmoji, getTrendLabel } from '../stats';

// Helper to build a FavoriteItem with defaults
const makeFav = (overrides: Partial<FavoriteItem> = {}): FavoriteItem => ({
  id: 'fav_1',
  imageUri: 'file:///photo.jpg',
  score: 75,
  gridType: 'thirds',
  date: '2026-03-15T10:00:00Z',
  sceneTag: '风景',
  ...overrides,
});

describe('stats service', () => {
  describe('computeStats', () => {
    it('returns zero summary when favorites is empty', () => {
      const result = computeStats([]);
      expect(result.totalPhotos).toBe(0);
      expect(result.avgScore).toBe(0);
      expect(result.bestScore).toBe(0);
      expect(result.mostUsedGrid).toBe('');
      expect(result.mostUsedScene).toBe('');
      expect(result.gridUsages).toEqual([]);
      expect(result.sceneUsages).toEqual([]);
      expect(result.monthlyStats).toEqual([]);
      expect(result.scoreHistory).toEqual([]);
      expect(result.recentTrend).toBe('stable');
    });

    it('computes avgScore as rounded mean of scores', () => {
      const favorites = [
        makeFav({ id: 'f1', score: 80 }),
        makeFav({ id: 'f2', score: 90 }),
        makeFav({ id: 'f3', score: 70 }),
      ];
      const result = computeStats(favorites);
      expect(result.avgScore).toBe(80); // (80+90+70)/3 = 80
    });

    it('computes bestScore as max score', () => {
      const favorites = [
        makeFav({ id: 'f1', score: 60 }),
        makeFav({ id: 'f2', score: 95 }),
        makeFav({ id: 'f3', score: 75 }),
      ];
      const result = computeStats(favorites);
      expect(result.bestScore).toBe(95);
    });

    it('computes mostUsedGrid as mode of gridType values', () => {
      const favorites = [
        makeFav({ id: 'f1', gridType: 'thirds' }),
        makeFav({ id: 'f2', gridType: 'thirds' }),
        makeFav({ id: 'f3', gridType: 'golden' }),
      ];
      const result = computeStats(favorites);
      expect(result.mostUsedGrid).toBe('thirds');
    });

    it('computes mostUsedScene as mode of non-empty sceneTag values', () => {
      const favorites = [
        makeFav({ id: 'f1', sceneTag: '风景' }),
        makeFav({ id: 'f2', sceneTag: '风景' }),
        makeFav({ id: 'f3', sceneTag: '人像' }),
      ];
      const result = computeStats(favorites);
      expect(result.mostUsedScene).toBe('风景');
    });

    it('ignores empty sceneTag when computing mostUsedScene', () => {
      const favorites = [
        makeFav({ id: 'f1', sceneTag: '' }),
        makeFav({ id: 'f2', sceneTag: '' }),
        makeFav({ id: 'f3', sceneTag: '风景' }),
      ];
      const result = computeStats(favorites);
      expect(result.mostUsedScene).toBe('风景');
    });

    it('computes gridUsages with count, avgScore, percentage per gridType', () => {
      const favorites = [
        makeFav({ id: 'f1', gridType: 'thirds', score: 80 }),
        makeFav({ id: 'f2', gridType: 'thirds', score: 90 }),
        makeFav({ id: 'f3', gridType: 'golden', score: 70 }),
      ];
      const result = computeStats(favorites);
      expect(result.gridUsages).toContainEqual(
        expect.objectContaining({
          gridType: 'thirds',
          count: 2,
          avgScore: 85,
          percentage: expect.any(Number),
        })
      );
      expect(result.gridUsages).toContainEqual(
        expect.objectContaining({ gridType: 'golden', count: 1, avgScore: 70 })
      );
    });

    it('gridUsages percentages sum to ~100', () => {
      const favorites = [
        makeFav({ id: 'f1', gridType: 'thirds' }),
        makeFav({ id: 'f2', gridType: 'thirds' }),
        makeFav({ id: 'f3', gridType: 'golden' }),
        makeFav({ id: 'f4', gridType: 'diagonal' }),
      ];
      const result = computeStats(favorites);
      const sum = result.gridUsages.reduce((acc, g) => acc + g.percentage, 0);
      expect(sum).toBeCloseTo(100, 1);
    });

    it('computes sceneUsages with count and percentage per sceneTag', () => {
      const favorites = [
        makeFav({ id: 'f1', sceneTag: '风景' }),
        makeFav({ id: 'f2', sceneTag: '风景' }),
        makeFav({ id: 'f3', sceneTag: '人像' }),
      ];
      const result = computeStats(favorites);
      expect(result.sceneUsages).toContainEqual(
        expect.objectContaining({ sceneTag: '风景', count: 2 })
      );
      expect(result.sceneUsages).toContainEqual(
        expect.objectContaining({ sceneTag: '人像', count: 1 })
      );
    });

    it('sceneUsages ignores empty sceneTag', () => {
      const favorites = [
        makeFav({ id: 'f1', sceneTag: '' }),
        makeFav({ id: 'f2', sceneTag: '风景' }),
      ];
      const result = computeStats(favorites);
      expect(result.sceneUsages.map(s => s.sceneTag)).not.toContain('');
    });

    it('computes monthlyStats sorted newest-first (YEAR-MM descending)', () => {
      const favorites = [
        makeFav({ id: 'f1', date: '2026-02-01T00:00:00Z' }),
        makeFav({ id: 'f2', date: '2026-03-01T00:00:00Z' }),
        makeFav({ id: 'f3', date: '2026-01-01T00:00:00Z' }),
      ];
      const result = computeStats(favorites);
      expect(result.monthlyStats.map(m => m.month)).toEqual(['2026-03', '2026-02', '2026-01']);
    });

    it('monthlyStats includes count and avgScore per month', () => {
      const favorites = [
        makeFav({ id: 'f1', date: '2026-03-01T00:00:00Z', score: 80 }),
        makeFav({ id: 'f2', date: '2026-03-15T00:00:00Z', score: 90 }),
        makeFav({ id: 'f3', date: '2026-02-01T00:00:00Z', score: 70 }),
      ];
      const result = computeStats(favorites);
      const march = result.monthlyStats.find(m => m.month === '2026-03');
      expect(march).toEqual(expect.objectContaining({ month: '2026-03', count: 2, avgScore: 85 }));
    });

    it('scoreHistory returns last 30 scores formatted as MM/DD', () => {
      const favorites = Array.from({ length: 35 }, (_, i) =>
        makeFav({ id: `f${i}`, date: `2026-0${(i % 9) + 1}-${10 + i}T00:00:00Z` })
      );
      const result = computeStats(favorites);
      expect(result.scoreHistory).toHaveLength(30);
      // Each entry should have date in MM/DD format
      expect(result.scoreHistory[0].date).toMatch(/^\d{2}\/\d{2}$/);
    });

    it('scoreHistory is sorted newest-first', () => {
      const favorites = [
        makeFav({ id: 'f1', date: '2026-03-01T00:00:00Z', score: 60 }),
        makeFav({ id: 'f2', date: '2026-03-15T00:00:00Z', score: 80 }),
        makeFav({ id: 'f3', date: '2026-02-01T00:00:00Z', score: 70 }),
      ];
      const result = computeStats(favorites);
      expect(result.scoreHistory[0].score).toBe(80); // newest first
    });

    it('recentTrend returns "up" when recent 5 avg > previous 5 avg by > 3', () => {
      // Create 10+ favorites with improving scores
      const favorites = [
        ...Array.from({ length: 6 }, (_, i) =>
          makeFav({ id: `old${i}`, date: `2026-0${i + 1}-15T00:00:00Z`, score: 60 + i })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeFav({ id: `new${i}`, date: `2026-04-${i + 1}T00:00:00Z`, score: 85 + i })
        ),
      ];
      const result = computeStats(favorites);
      expect(result.recentTrend).toBe('up');
    });

    it('recentTrend returns "down" when recent 5 avg < previous 5 avg by > 3', () => {
      const favorites = [
        ...Array.from({ length: 6 }, (_, i) =>
          makeFav({ id: `old${i}`, date: `2026-0${i + 1}-15T00:00:00Z`, score: 90 - i })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeFav({ id: `new${i}`, date: `2026-04-${i + 1}T00:00:00Z`, score: 50 + i })
        ),
      ];
      const result = computeStats(favorites);
      expect(result.recentTrend).toBe('down');
    });

    it('recentTrend returns "stable" when totalPhotos < 10', () => {
      const favorites = Array.from({ length: 5 }, (_, i) =>
        makeFav({ id: `f${i}`, score: 70 + i })
      );
      const result = computeStats(favorites);
      expect(result.recentTrend).toBe('stable');
    });

    it('recentTrend returns "stable" when difference is within 3', () => {
      const favorites = [
        ...Array.from({ length: 6 }, (_, i) =>
          makeFav({ id: `old${i}`, date: `2026-0${i + 1}-15T00:00:00Z`, score: 75 })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeFav({ id: `new${i}`, date: `2026-04-${i + 1}T00:00:00Z`, score: 76 })
        ),
      ];
      const result = computeStats(favorites);
      expect(result.recentTrend).toBe('stable');
    });
  });

  describe('getScoreEmoji', () => {
    it('returns 🏆 for score >= 90', () => {
      expect(getScoreEmoji(90)).toBe('🏆');
      expect(getScoreEmoji(100)).toBe('🏆');
    });

    it('returns 🌟 for score >= 75 and < 90', () => {
      expect(getScoreEmoji(75)).toBe('🌟');
      expect(getScoreEmoji(89)).toBe('🌟');
    });

    it('returns 👍 for score >= 60 and < 75', () => {
      expect(getScoreEmoji(60)).toBe('👍');
      expect(getScoreEmoji(74)).toBe('👍');
    });

    it('returns 😐 for score >= 40 and < 60', () => {
      expect(getScoreEmoji(40)).toBe('😐');
      expect(getScoreEmoji(59)).toBe('😐');
    });

    it('returns 💪 for score < 40', () => {
      expect(getScoreEmoji(39)).toBe('💪');
      expect(getScoreEmoji(0)).toBe('💪');
    });
  });

  describe('getTrendLabel', () => {
    it('returns "上升 📈" for up trend', () => {
      expect(getTrendLabel('up')).toBe('上升 📈');
    });

    it('returns "下降 📉" for down trend', () => {
      expect(getTrendLabel('down')).toBe('下降 📉');
    });

    it('returns "稳定" for stable trend', () => {
      expect(getTrendLabel('stable')).toBe('稳定');
    });
  });
});
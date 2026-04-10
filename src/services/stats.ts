import type { FavoriteItem } from './favorites';

export interface GridUsage {
  gridType: string;
  count: number;
  avgScore: number;
  percentage: number;
}

export interface SceneUsage {
  sceneTag: string;
  count: number;
  percentage: number;
}

export interface MonthlyStats {
  month: string; // "2026-04"
  count: number;
  avgScore: number;
}

export interface StatsSummary {
  totalPhotos: number;
  avgScore: number;
  bestScore: number;
  mostUsedGrid: string;
  mostUsedScene: string;
  gridUsages: GridUsage[];
  sceneUsages: SceneUsage[];
  monthlyStats: MonthlyStats[];
  scoreHistory: { date: string; score: number }[];
  recentTrend: 'up' | 'down' | 'stable'; // based on last 5 vs previous 5
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function mode(items: string[]): string {
  if (items.length === 0) return '';
  const freq: Record<string, number> = {};
  for (const item of items) {
    freq[item] = (freq[item] ?? 0) + 1;
  }
  let best = items[0];
  for (const [k, v] of Object.entries(freq)) {
    if (v > (freq[best] ?? 0)) best = k;
  }
  return best;
}

export function computeStats(favorites: FavoriteItem[]): StatsSummary {
  const totalPhotos = favorites.length;

  if (totalPhotos === 0) {
    return {
      totalPhotos: 0,
      avgScore: 0,
      bestScore: 0,
      mostUsedGrid: '',
      mostUsedScene: '',
      gridUsages: [],
      sceneUsages: [],
      monthlyStats: [],
      scoreHistory: [],
      recentTrend: 'stable',
    };
  }

  const scores = favorites.map((f) => f.score);
  const avgScore = Math.round(mean(scores));
  const bestScore = Math.max(...scores);

  const gridTypes = favorites.map((f) => f.gridType);
  const mostUsedGrid = mode(gridTypes);

  const nonEmptySceneTags = favorites
    .map((f) => f.sceneTag ?? '')
    .filter((t) => t !== '');
  const mostUsedScene = mode(nonEmptySceneTags);

  // Grid usages
  const gridGroups: Record<string, FavoriteItem[]> = {};
  for (const fav of favorites) {
    if (!gridGroups[fav.gridType]) gridGroups[fav.gridType] = [];
    gridGroups[fav.gridType].push(fav);
  }
  const gridUsages: GridUsage[] = Object.entries(gridGroups).map(([gridType, items]) => ({
    gridType,
    count: items.length,
    avgScore: Math.round(mean(items.map((i) => i.score))),
    percentage: Math.round((items.length / totalPhotos) * 10000) / 100,
  }));

  // Scene usages (exclude empty)
  const sceneGroups: Record<string, FavoriteItem[]> = {};
  for (const fav of favorites) {
    const tag = fav.sceneTag ?? '';
    if (!tag) continue;
    if (!sceneGroups[tag]) sceneGroups[tag] = [];
    sceneGroups[tag].push(fav);
  }
  const sceneUsages: SceneUsage[] = Object.entries(sceneGroups).map(([sceneTag, items]) => ({
    sceneTag,
    count: items.length,
    percentage: Math.round((items.length / totalPhotos) * 10000) / 100,
  }));

  // Monthly stats
  const monthGroups: Record<string, FavoriteItem[]> = {};
  for (const fav of favorites) {
    const month = fav.date.slice(0, 7); // "YYYY-MM"
    if (!monthGroups[month]) monthGroups[month] = [];
    monthGroups[month].push(fav);
  }
  const monthlyStats: MonthlyStats[] = Object.entries(monthGroups)
    .map(([month, items]) => ({
      month,
      count: items.length,
      avgScore: Math.round(mean(items.map((i) => i.score))),
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  // Score history (last 30, as "MM/DD")
  const sorted = [...favorites].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const scoreHistory = sorted.slice(0, 30).map((f) => {
    const d = new Date(f.date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { date: `${mm}/${dd}`, score: f.score };
  });

  // Recent trend
  let recentTrend: StatsSummary['recentTrend'] = 'stable';
  if (totalPhotos >= 10) {
    const sortedAsc = [...favorites].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recent5 = sortedAsc.slice(-5).map((f) => f.score);
    const prev5 = sortedAsc.slice(-10, -5).map((f) => f.score);
    if (prev5.length === 5) {
      const diff = mean(recent5) - mean(prev5);
      if (diff > 3) recentTrend = 'up';
      else if (diff < -3) recentTrend = 'down';
      else recentTrend = 'stable';
    } else {
      recentTrend = 'stable';
    }
  }

  return {
    totalPhotos,
    avgScore,
    bestScore,
    mostUsedGrid,
    mostUsedScene,
    gridUsages,
    sceneUsages,
    monthlyStats,
    scoreHistory,
    recentTrend,
  };
}

export function getScoreEmoji(score: number): string {
  if (score >= 90) return '🏆';
  if (score >= 75) return '🌟';
  if (score >= 60) return '👍';
  if (score >= 40) return '😐';
  return '💪';
}

export function getTrendLabel(trend: StatsSummary['recentTrend']): string {
  if (trend === 'up') return '上升 📈';
  if (trend === 'down') return '下降 📉';
  return '稳定';
}

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { loadFavorites, addFavorite, removeFavorite, generateFavoriteId, saveFavorites, FavoriteItem } from '../services/favorites';

// We test the service layer directly since the hook wraps it
// This gives us good coverage of the core logic

const STORAGE_KEY = '@photo_advisor_favorites';

describe('favorites service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('loadFavorites', () => {
    it('returns empty array when nothing stored', async () => {
      const result = await loadFavorites();
      expect(result).toEqual([]);
    });

    it('returns parsed favorites when stored', async () => {
      const item: FavoriteItem = {
        id: 'fav_1',
        uri: 'https://example.com/photo.jpg',
        score: 88,
        date: '2026-04-10T14:00:00.000Z',
        gridType: '三分法',
        suggestion: '建议稍微上移',
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([item]));
      const result = await loadFavorites();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fav_1');
      expect(result[0].score).toBe(88);
    });

    it('returns empty array on parse error', async () => {
      await AsyncStorage.setItem(STORAGE_KEY, 'not valid json');
      const result = await loadFavorites();
      expect(result).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    it('prepends new item to existing favorites', async () => {
      const existing: FavoriteItem = {
        id: 'fav_existing',
        uri: 'https://example.com/old.jpg',
        score: 70,
        date: '2026-04-10T10:00:00.000Z',
        gridType: '三分法',
        suggestion: '',
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existing]));

      const newItem: FavoriteItem = {
        id: 'fav_new',
        uri: 'https://example.com/new.jpg',
        score: 90,
        date: '2026-04-10T15:00:00.000Z',
        gridType: '黄金分割',
        suggestion: '',
      };
      const result = await addFavorite(newItem);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('fav_new');
      expect(result[1].id).toBe('fav_existing');
    });

    it('creates favorites list if none exists', async () => {
      const newItem: FavoriteItem = {
        id: 'fav_first',
        uri: 'https://example.com/first.jpg',
        score: 85,
        date: '2026-04-10T15:00:00.000Z',
        gridType: '三分法',
        suggestion: '',
      };
      const result = await addFavorite(newItem);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fav_first');
    });
  });

  describe('removeFavorite', () => {
    it('removes item by id', async () => {
      const items: FavoriteItem[] = [
        { id: 'fav_1', uri: 'https://example.com/1.jpg', score: 80, date: '2026-04-10T10:00:00.000Z', gridType: '三分法', suggestion: '' },
        { id: 'fav_2', uri: 'https://example.com/2.jpg', score: 85, date: '2026-04-10T11:00:00.000Z', gridType: '黄金分割', suggestion: '' },
      ];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));

      const result = await removeFavorite('fav_1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fav_2');
    });

    it('returns all items when id not found', async () => {
      const items: FavoriteItem[] = [
        { id: 'fav_1', uri: 'https://example.com/1.jpg', score: 80, date: '2026-04-10T10:00:00.000Z', gridType: '三分法', suggestion: '' },
      ];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));

      const result = await removeFavorite('non_existent_id');

      expect(result).toHaveLength(1);
    });
  });

  describe('generateFavoriteId', () => {
    it('generates unique ids', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateFavoriteId());
      }
      // All 100 should be unique
      expect(ids.size).toBe(100);
    });

    it('id starts with fav_ prefix', () => {
      const id = generateFavoriteId();
      expect(id.startsWith('fav_')).toBe(true);
    });
  });

  describe('saveFavorites', () => {
    it('persists favorites to AsyncStorage', async () => {
      const items: FavoriteItem[] = [
        { id: 'fav_1', uri: 'https://example.com/1.jpg', score: 90, date: '2026-04-10T10:00:00.000Z', gridType: '三分法', suggestion: '' },
      ];
      await saveFavorites(items);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('fav_1');
    });
  });
});

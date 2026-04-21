/**
 * Unit tests for src/services/favorites.ts
 * Tests: loadFavorites, saveFavorites, addFavorite, removeFavorite, generateFavoriteId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage before importing the module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {
  loadFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  generateFavoriteId,
} from '../services/favorites';
import type { FavoriteItem } from '../types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const sampleFavorite: FavoriteItem = {
  id: 'fav_test_001',
  uri: 'file:///test/photo.jpg',
  score: 85,
  scoreReason: '构图优秀',
  date: '2026-04-21T08:00:00.000Z',
  gridType: '三分法',
  suggestion: '将主体放在左侧三分线附近',
  sceneTag: '风景',
};

describe('generateFavoriteId', () => {
  it('generates a unique id string starting with fav_', () => {
    const id = generateFavoriteId();
    expect(id).toMatch(/^fav_\d+_[a-z0-9]+$/);
  });

  it('generates different ids on successive calls', () => {
    const ids = new Set([generateFavoriteId(), generateFavoriteId(), generateFavoriteId()]);
    expect(ids.size).toBe(3);
  });
});

describe('loadFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when nothing is stored', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await loadFavorites();
    expect(result).toEqual([]);
  });

  it('parses and returns stored favorites', async () => {
    const stored = JSON.stringify([sampleFavorite]);
    mockAsyncStorage.getItem.mockResolvedValue(stored);
    const result = await loadFavorites();
    expect(result).toEqual([sampleFavorite]);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@photo_advisor_favorites');
  });

  it('returns empty array on JSON parse error', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('invalid json');
    const result = await loadFavorites();
    expect(result).toEqual([]);
  });

  it('returns empty array when getItem throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const result = await loadFavorites();
    expect(result).toEqual([]);
  });
});

describe('saveFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('stores a JSON-serialized array', async () => {
    const favorites = [sampleFavorite];
    await saveFavorites(favorites);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@photo_advisor_favorites',
      JSON.stringify(favorites)
    );
  });

  it('stores empty array correctly', async () => {
    await saveFavorites([]);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@photo_advisor_favorites',
      '[]'
    );
  });

  it('allows multiple saves (idempotent)', async () => {
    await saveFavorites([sampleFavorite]);
    await saveFavorites([sampleFavorite, { ...sampleFavorite, id: 'fav_002' }]);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
  });
});

describe('addFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('adds item to the front of the favorites list', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([sampleFavorite]));
    const newItem: FavoriteItem = { ...sampleFavorite, id: 'fav_new', score: 90 };

    const result = await addFavorite(newItem);

    expect(result[0]).toEqual(newItem);
    expect(result[1]).toEqual(sampleFavorite);
  });

  it('prepends when existing list is empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await addFavorite(sampleFavorite);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleFavorite);
  });

  it('saves the updated list to storage', async () => {
    await addFavorite(sampleFavorite);
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });
});

describe('removeFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([sampleFavorite]));
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('removes the item with the given id', async () => {
    const result = await removeFavorite('fav_test_001');
    expect(result).toHaveLength(0);
  });

  it('does not remove items with different ids', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([sampleFavorite]));
    const result = await removeFavorite('non_existent_id');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fav_test_001');
  });

  it('saves the updated list to storage', async () => {
    await removeFavorite('fav_test_001');
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });

  it('handles empty stored list gracefully', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await removeFavorite('any_id');
    expect(result).toHaveLength(0);
  });

  it('removes only the specified id, keeping others', async () => {
    const fav2: FavoriteItem = { ...sampleFavorite, id: 'fav_002', score: 70 };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([sampleFavorite, fav2]));

    const result = await removeFavorite('fav_test_001');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('fav_002');
  });
});
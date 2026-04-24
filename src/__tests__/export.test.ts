/**
 * Unit tests for src/services/export.ts
 * Tests: buildExportJson, importData, clearAllData, exportAllData
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo-file-system (legacy API)
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import * as FileSystem from 'expo-file-system';
import Sharing from 'expo-sharing';
import DocumentPicker from 'expo-document-picker';
import {
  buildExportJson,
  exportAllData,
  importData,
  importFromFile,
  clearAllData,
} from '../services/export';
import { loadFavorites, saveFavorites } from '../services/favorites';
import { loadLog } from '../services/shootLog';
import type { FavoriteItem, ShootLogEntry } from '../types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockSharing = Sharing as jest.Mocked<typeof Sharing>;
const mockDocPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

const sampleFavorite: FavoriteItem = {
  id: 'fav_test_001',
  uri: 'file:///test/photo.jpg',
  score: 85,
  scoreReason: '构图优秀',
  date: '2026-04-21T08:00:00.000Z',
  gridType: 'thirds',
  suggestion: '将主体放在左侧三分线附近',
  sceneTag: '风景',
};

const sampleLogEntry: ShootLogEntry = {
  id: 'shoot_test_001',
  date: '2026-04-21T08:00:00.000Z',
  gridType: 'thirds',
  score: 80,
  wasFavorite: true,
  suggestions: ['建议1', '建议2'],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockAsyncStorage.removeItem.mockResolvedValue(undefined);
});

describe('buildExportJson', () => {
  it('returns valid JSON with correct structure', async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([sampleFavorite]))
      .mockResolvedValueOnce(JSON.stringify([sampleLogEntry]));

    const json = await buildExportJson();

    let parsed: any;
    expect(() => {
      parsed = JSON.parse(json);
    }).not.toThrow();

    expect(parsed).toHaveProperty('version', '1.1.0');
    expect(parsed).toHaveProperty('exportedAt');
    expect(parsed).toHaveProperty('favorites');
    expect(parsed).toHaveProperty('shootLog');
    expect(parsed).toHaveProperty('stats', null);
    expect(Array.isArray(parsed.favorites)).toBe(true);
    expect(Array.isArray(parsed.shootLog)).toBe(true);
  });

  it('includes favorites and shootLog entries', async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([sampleFavorite]))
      .mockResolvedValueOnce(JSON.stringify([sampleLogEntry]));

    const json = await buildExportJson();
    const parsed = JSON.parse(json);

    expect(parsed.favorites).toContainEqual(expect.objectContaining({ id: 'fav_test_001' }));
    expect(parsed.shootLog).toContainEqual(expect.objectContaining({ id: 'shoot_test_001' }));
  });
});

describe('importData', () => {
  it('merges new favorites and skips duplicates', async () => {
    const existingFav: FavoriteItem = { ...sampleFavorite, id: 'fav_existing' };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([existingFav]));

    const importedFav: FavoriteItem = { ...sampleFavorite, id: 'fav_new' };
    const data = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      favorites: [importedFav, existingFav], // existing one should be skipped
      shootLog: [],
      stats: null as any,
    };

    const result = await importData(data);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);

    // Verify saveFavorites was called with the merged list
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@photo_advisor_favorites',
      expect.stringContaining('fav_new')
    );
  });

  it('skips existing shootLog entries', async () => {
    const existingEntry: ShootLogEntry = { ...sampleLogEntry, id: 'shoot_existing' };
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([])) // favorites
      .mockResolvedValueOnce(JSON.stringify([existingEntry])); // shootLog

    const newEntry: ShootLogEntry = { ...sampleLogEntry, id: 'shoot_new' };
    const data = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      favorites: [],
      shootLog: [newEntry, existingEntry],
      stats: null as any,
    };

    const result = await importData(data);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('throws AppError on invalid JSON (non-object data)', async () => {
    await expect(importData(null as any)).rejects.toThrow('导入数据格式无效');
    await expect(importData(undefined as any)).rejects.toThrow('导入数据格式无效');
  });

  it('throws AppError when favorites is not an array', async () => {
    const data = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      favorites: 'not an array',
      shootLog: [],
      stats: null,
    } as unknown as Parameters<typeof importData>[0];

    await expect(importData(data)).rejects.toThrow('导入数据格式无效');
  });

  it('throws AppError when shootLog is not an array', async () => {
    const data = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      favorites: [],
      shootLog: 'not an array',
      stats: null,
    } as unknown as Parameters<typeof importData>[0];

    await expect(importData(data)).rejects.toThrow('导入数据格式无效');
  });
});

describe('clearAllData', () => {
  it('calls both favorites and shootLog clear functions', async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([sampleFavorite]))
      .mockResolvedValueOnce(JSON.stringify([sampleLogEntry]));

    await clearAllData();

    // favorites cleared via setItem with empty array (saveFavorites([]))
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@photo_advisor_favorites',
      '[]'
    );
    // shootLog cleared via removeItem (clearLog uses removeItem)
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@photo_advisor_shoot_log');
  });
});

describe('exportAllData', () => {
  it('returns false when sharing is cancelled', async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([sampleFavorite]))
      .mockResolvedValueOnce(JSON.stringify([sampleLogEntry]));

    mockSharing.isAvailableAsync.mockResolvedValue(true);
    mockSharing.shareAsync.mockRejectedValue(new Error('User cancelled'));

    const result = await exportAllData();

    expect(result).toBe(false);
  });

  it('returns false when sharing is not available', async () => {
    mockAsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify([]))
      .mockResolvedValueOnce(JSON.stringify([]));

    mockSharing.isAvailableAsync.mockResolvedValue(false);

    const result = await exportAllData();

    expect(result).toBe(false);
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });
});

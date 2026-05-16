/**
 * Tests for export service
 */

import { exportAllData, importData, importFromFile, clearAllData, buildExportJson } from '../export';

// Mock all dependencies
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/mock/cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../favorites', () => ({
  loadFavorites: jest.fn(),
  saveFavorites: jest.fn(),
}));

jest.mock('../shootLog', () => ({
  loadLog: jest.fn(),
  saveLog: jest.fn(),
  clearLog: jest.fn(),
}));

jest.mock('../errors', () => ({
  AppError: class MockAppError extends Error {
    code: string;
    level: string;
    retryable: boolean;
    context: string;
    constructor(message: string, code: string, level: string, retryable: boolean, context: string) {
      super(message);
      this.name = 'AppError';
      this.code = code;
      this.level = level;
      this.retryable = retryable;
      this.context = context;
    }
  },
}));

import * as FileSystem from 'expo-file-system/legacy';
import Sharing from 'expo-sharing';
import DocumentPicker from 'expo-document-picker';
import { loadFavorites, saveFavorites } from '../favorites';
import { loadLog, saveLog, clearLog } from '../shootLog';
import { AppError } from '../errors';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const mockFavorites = [
  { id: 'fav1', uri: 'file://img1.jpg', timestamp: 1710000000000, note: 'Nice shot', tags: ['landscape'], gridVariant: 'thirds', score: 85, keypoints: [], aiSuggestion: null },
  { id: 'fav2', uri: 'file://img2.jpg', timestamp: 1710000001000, note: '', tags: [], gridVariant: 'golden', score: 90, keypoints: [], aiSuggestion: null },
];

const mockLog = [
  { id: 'log1', uri: 'file://img1.jpg', timestamp: 1710000000000, location: null, gridVariant: 'thirds', score: 85, aiSuggestion: null, favorite: true },
];

describe('buildExportJson', () => {
  it('builds JSON with version, exportedAt, favorites, shootLog, stats:null', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue(mockFavorites);
    (loadLog as jest.Mock).mockResolvedValue(mockLog);

    const json = await buildExportJson();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('1.1.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.favorites).toEqual(mockFavorites);
    expect(parsed.shootLog).toEqual(mockLog);
    expect(parsed.stats).toBeNull();
  });

  it('returns empty arrays when no data exists', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);

    const json = await buildExportJson();
    const parsed = JSON.parse(json);

    expect(parsed.favorites).toEqual([]);
    expect(parsed.shootLog).toEqual([]);
  });
});

describe('exportAllData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-16T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes JSON file and calls Sharing.shareAsync', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue(mockFavorites);
    (loadLog as jest.Mock).mockResolvedValue(mockLog);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await exportAllData();

    expect(result).toBe(true);
    // Filename uses real system time, just verify pattern
    const call = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    // Format: photo-advisor-backup-YYYYMMDD-HHMMSS.json (local time)
    expect(call[0]).toMatch(/photo-advisor-backup-\d{8}-\d{6}\.json$/);
    expect(call[1]).toEqual(expect.any(String));
    expect(call[2]).toEqual({ encoding: 'utf8' });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringMatching(/photo-advisor-backup-\d{8}-\d{6}\.json$/),
      { mimeType: 'application/json', dialogTitle: '导出拍摄参谋数据' }
    );
  });

  it('returns false when sharing is not available and cleans up temp file', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await exportAllData();

    expect(result).toBe(false);
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('returns false when user cancels sharing (throws)', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('cancelled'));

    const result = await exportAllData();

    expect(result).toBe(false);
  });

  it('always cleans up temp file even when sharing throws', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockRejectedValue(new Error('cancelled'));
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    await exportAllData();

    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });
});

describe('importData', () => {
  it('imports favorites and shootLog entries not already present', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([mockFavorites[0]]);
    (loadLog as jest.Mock).mockResolvedValue([mockLog[0]]);
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (saveLog as jest.Mock).mockResolvedValue(undefined);

    const data = {
      version: '1.1.0',
      exportedAt: '2026-05-16T10:00:00.000Z',
      favorites: [
        { id: 'fav1', uri: 'file://img1.jpg', timestamp: 1710000000000, note: 'Nice shot', tags: ['landscape'], gridVariant: 'thirds', score: 85, keypoints: [], aiSuggestion: null },
        { id: 'fav3', uri: 'file://img3.jpg', timestamp: 1710000002000, note: '', tags: [], gridVariant: 'thirds', score: 88, keypoints: [], aiSuggestion: null },
      ],
      shootLog: [
        { id: 'log1', uri: 'file://img1.jpg', timestamp: 1710000000000, location: null, gridVariant: 'thirds', score: 85, aiSuggestion: null, favorite: true },
        { id: 'log3', uri: 'file://img3.jpg', timestamp: 1710000002000, location: null, gridVariant: 'thirds', score: 80, aiSuggestion: null, favorite: false },
      ],
      stats: { totalShots: 100, avgScore: 82 },
    };

    const result = await importData(data);

    expect(result.imported).toBe(2); // fav3 + log3
    expect(result.skipped).toBe(2); // fav1 + log1 duplicate
    expect(saveFavorites).toHaveBeenCalledWith([
      mockFavorites[0],
      data.favorites[1],
    ]);
    expect(saveLog).toHaveBeenCalledWith([
      mockLog[0],
      data.shootLog[1],
    ]);
  });

  it('throws AppError if data is null/undefined', async () => {
    await expect(importData(null as any)).rejects.toThrow(AppError);
    await expect(importData(undefined as any)).rejects.toThrow(AppError);
  });

  it('throws AppError if favorites is not an array', async () => {
    await expect(importData({
      version: '1.1.0',
      exportedAt: '2026-05-16T10:00:00.000Z',
      favorites: 'not an array' as any,
      shootLog: [],
      stats: null,
    })).rejects.toThrow(AppError);
  });

  it('throws AppError if shootLog is not an array', async () => {
    await expect(importData({
      version: '1.1.0',
      exportedAt: '2026-05-16T10:00:00.000Z',
      favorites: [],
      shootLog: 'not an array' as any,
      stats: null,
    })).rejects.toThrow(AppError);
  });

  it('does not save anything if all entries are duplicates', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue(mockFavorites);
    (loadLog as jest.Mock).mockResolvedValue(mockLog);
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (saveLog as jest.Mock).mockResolvedValue(undefined);

    const data = {
      version: '1.1.0',
      exportedAt: '2026-05-16T10:00:00.000Z',
      favorites: [mockFavorites[0]],
      shootLog: [mockLog[0]],
      stats: null,
    };

    const result = await importData(data);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(2);
    expect(saveFavorites).not.toHaveBeenCalled();
    expect(saveLog).not.toHaveBeenCalled();
  });

  it('handles empty existing data', async () => {
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (saveLog as jest.Mock).mockResolvedValue(undefined);

    const data = {
      version: '1.1.0',
      exportedAt: '2026-05-16T10:00:00.000Z',
      favorites: [mockFavorites[0], mockFavorites[1]],
      shootLog: [mockLog[0]],
      stats: null,
    };

    const result = await importData(data);

    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
  });
});

describe('importFromFile', () => {
  it('returns null when user cancels document picker', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });

    const result = await importFromFile();

    expect(result).toBeNull();
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  it('reads and parses selected JSON file', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('{"version":"1.1.0","favorites":[],"shootLog":[],"stats":null}');
    (loadFavorites as jest.Mock).mockResolvedValue([]);
    (loadLog as jest.Mock).mockResolvedValue([]);
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (saveLog as jest.Mock).mockResolvedValue(undefined);

    const result = await importFromFile();

    expect(result).not.toBeNull();
    expect(result!.imported).toBe(0);
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file://backup.json', { encoding: 'utf8' });
  });

  it('throws AppError when file read fails', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('read error'));

    await expect(importFromFile()).rejects.toThrow(AppError);
  });

  it('throws AppError when JSON is invalid', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://backup.json' }],
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('not valid json {');

    await expect(importFromFile()).rejects.toThrow(AppError);
  });
});

describe('clearAllData', () => {
  it('calls saveFavorites with empty array and clearLog', async () => {
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (clearLog as jest.Mock).mockResolvedValue(undefined);

    await clearAllData();

    expect(saveFavorites).toHaveBeenCalledWith([]);
    expect(clearLog).toHaveBeenCalled();
  });

  it('clears favorites even if log fails', async () => {
    (saveFavorites as jest.Mock).mockResolvedValue(undefined);
    (clearLog as jest.Mock).mockRejectedValue(new Error('clear failed'));

    await expect(clearAllData()).rejects.toThrow();
    expect(saveFavorites).toHaveBeenCalledWith([]);
  });
});

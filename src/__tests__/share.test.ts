/**
 * Tests for src/services/share.ts
 */

import { sharePhoto, ShareOptions } from '../services/share';

// Mock expo-file-system and expo-image-manipulator and expo-sharing
jest.mock('expo-file-system/legacy', () => ({
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/reshared.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-sharing', () => ({
  __esModule: true,
  default: {
    isAvailableAsync: jest.fn(),
    shareAsync: jest.fn(),
  },
}));

const mockSharing = require('expo-sharing').default;

describe('sharePhoto', () => {
  const baseOptions: ShareOptions = {
    photoUri: 'file:///test/photo.jpg',
    suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
    gridType: '三分法',
    score: 85,
    gridVariant: 'thirds',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSharing.isAvailableAsync.mockResolvedValue(true);
    mockSharing.shareAsync.mockResolvedValue(undefined);
  });

  it('returns error when sharing is not available', async () => {
    mockSharing.isAvailableAsync.mockResolvedValue(false);

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('当前设备不支持分享功能');
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });

  it('prepares image and calls shareAsync when sharing is available', async () => {
    const ImageManipulator = require('expo-image-manipulator');
    const FileSystem = require('expo-file-system/legacy');

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(true);
    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file:///test/photo.jpg',
      [{ resize: { width: 1920 } }],
      { compress: 0.85, format: 'jpeg' }
    );
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/reshared.jpg',
      { mimeType: 'image/jpeg', dialogTitle: '分享构图分析' }
    );
  });

  it('cleans up the temp file after sharing', async () => {
    const FileSystem = require('expo-file-system/legacy');

    await sharePhoto(baseOptions);

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/reshared.jpg', { idempotent: true });
  });

  it('returns error when shareAsync throws', async () => {
    mockSharing.shareAsync.mockRejectedValue(new Error('Share cancelled'));

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Share cancelled');
  });

  it('works without score', async () => {
    const opts: ShareOptions = { ...baseOptions, score: undefined };
    delete opts.score;

    const result = await sharePhoto(opts);

    expect(result.success).toBe(true);
  });

  it('works without gridVariant', async () => {
    const opts: ShareOptions = { ...baseOptions };
    delete opts.gridVariant;

    const result = await sharePhoto(opts);

    expect(result.success).toBe(true);
  });

  it('works with empty suggestions', async () => {
    const opts: ShareOptions = { ...baseOptions, suggestions: [] };

    const result = await sharePhoto(opts);

    expect(result.success).toBe(true);
  });
});

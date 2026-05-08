/**
 * Tests for src/services/share.ts
 */

import { sharePhoto, buildShareText, ShareOptions } from '../services/share';

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

describe('buildShareText', () => {
  it('includes grid type', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('网格: 三分法');
  });

  it('includes grid icon for thirds', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('📐');
  });

  it('includes grid icon for golden ratio', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '黄金分割',
      gridVariant: 'golden',
    };
    const text = buildShareText(opts);
    expect(text).toContain('🥇');
  });

  it('includes grid icon for diagonal', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '对角线',
      gridVariant: 'diagonal',
    };
    const text = buildShareText(opts);
    expect(text).toContain('↗️');
  });

  it('includes grid icon for spiral', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '螺旋',
      gridVariant: 'spiral',
    };
    const text = buildShareText(opts);
    expect(text).toContain('🌀');
  });

  it('includes grid icon for none', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '无',
      gridVariant: 'none',
    };
    const text = buildShareText(opts);
    expect(text).toContain('⬜');
  });

  it('includes star rating when score is provided', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      score: 85,
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('评分:');
    expect(text).toContain('★');
  });

  it('renders 5 stars for score >= 90', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      score: 95,
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('★★★★★');
  });

  it('renders 4 stars for score >= 75', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      score: 80,
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('★★★★☆');
  });

  it('renders 1 star for score < 40', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      score: 30,
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('★☆☆☆☆');
  });

  it('does not include score line when score is undefined', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).not.toContain('评分:');
  });

  it('renders suggestions with bullet points', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: ['[左上] 将主体放在左侧三分线附近', '[右下] 留出空间平衡画面'],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('💡 AI 建议:');
    expect(text).toContain('• 将主体放在左侧三分线附近');
    expect(text).toContain('• 留出空间平衡画面');
  });

  it('strips region tags from suggestion text', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: ['[中心] 把主体放在画面中心'],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('• 把主体放在画面中心');
    expect(text).not.toContain('[中心]');
  });

  it('includes the footer', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toContain('📸 由拍摄参谋生成');
  });

  it('handles empty suggestions gracefully', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'thirds',
    };
    const text = buildShareText(opts);
    expect(text).toBeTruthy();
    expect(text).not.toContain('AI 建议');
  });

  it('uses default grid icon for unknown variant', () => {
    const opts: ShareOptions = {
      photoUri: 'file:///test.jpg',
      suggestions: [],
      gridType: '三分法',
      gridVariant: 'unknown-variant',
    };
    const text = buildShareText(opts);
    expect(text).toContain('📐');
  });
});

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
      { mimeType: 'image/jpeg', dialogTitle: '分享构图分析', text: expect.any(String) }
    );
    // Verify the text includes key share metadata
    const call = mockSharing.shareAsync.mock.calls[0][1];
    expect(call.text).toContain('拍摄参谋');
    expect(call.text).toContain('三分法');
    expect(call.text).toContain('★');
  });

  it('cleans up the temp file after sharing', async () => {
    const FileSystem = require('expo-file-system/legacy');

    await sharePhoto(baseOptions);

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/reshared.jpg', { idempotent: true });
  });

  it('returns success even when cleanup throws (cleanup errors are silently ignored)', async () => {
    const FileSystem = require('expo-file-system/legacy');
    // Simulate cleanup failing — share should still succeed
    FileSystem.deleteAsync.mockRejectedValueOnce(new Error('Cleanup failed'));

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(true);
    // Verify shareAsync was still called
    expect(mockSharing.shareAsync).toHaveBeenCalled();
  });

  it('returns error when shareAsync throws', async () => {
    mockSharing.shareAsync.mockRejectedValue(new Error('Share cancelled'));

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Share cancelled');
  });

  it('returns error when manipulateAsync fails', async () => {
    const ImageManipulator = require('expo-image-manipulator');
    ImageManipulator.manipulateAsync.mockRejectedValue(
      new Error('Image is corrupted or has unsupported format')
    );

    const result = await sharePhoto(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Image is corrupted or has unsupported format');
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();

    // Reset so subsequent tests are unaffected
    ImageManipulator.manipulateAsync.mockResolvedValue({ uri: 'file:///cache/reshared.jpg' });
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

  it('includes AI suggestions text in shareAsync call', async () => {
    const result = await sharePhoto(baseOptions);
    expect(result.success).toBe(true);
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/reshared.jpg',
      expect.objectContaining({ text: expect.stringContaining('💡 AI 建议') })
    );
  });
});

/**
 * Tests for useCaptureFlow hook.
 * Mirrors the patterns established in src/hooks/__tests__/useCaptureFlow.test.ts
 * while adding additional coverage for options passthrough and error paths.
 */
import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { useCaptureFlow } from '../hooks/useCaptureFlow';
import type { GridVariant, TimerDuration } from '../types';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { loadApiConfig } from '../services/api';

// ─── Mock dependencies ────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('../services/api', () => ({
  loadApiConfig: jest.fn(),
}));

jest.mock('../components/BurstSuggestionOverlay', () => ({
  detectBurstMoment: jest.fn(),
}));

// ─── Shared module-level mocks ────────────────────────────────────────────────

const mockTakePicture = jest.fn();
const mockRunAnalysis = jest.fn();
const mockSavePhotoToGallery = jest.fn();
const mockComputeScoreFromSuggestions = jest.fn();
const mockRequestLocation = jest.fn();
const mockSaveFavorite = jest.fn();
const mockShowToast = jest.fn();
const mockStartCountdown = jest.fn();
const mockCapturePreviewFrame = jest.fn();
const mockRecognizeSceneTag = jest.fn();
const mockSetSuggestions = jest.fn();
const mockSetLoading = jest.fn();
const mockSetShowBurstSuggestion = jest.fn();
const mockSetLastCapturedScore = jest.fn();
const mockSetLastCapturedScoreReason = jest.fn();
const mockSetLastCapturedUri = jest.fn();
const mockSetDefaultGridVariant = jest.fn();

// ─── Default options factory ───────────────────────────────────────────────────

function makeOptions(overrides = {}) {
  return {
    cameraReady: true,
    defaultGridVariant: 'thirds' as GridVariant,
    setDefaultGridVariant: mockSetDefaultGridVariant,
    timerDuration: 3 as TimerDuration,
    rawMode: false,
    suggestions: ['建议1', '建议2'],
    sceneTag: '风景',
    setSuggestions: mockSetSuggestions,
    setLoading: mockSetLoading,
    setShowBurstSuggestion: mockSetShowBurstSuggestion,
    burstSuggestionText: { current: '' },
    setLastCapturedScore: mockSetLastCapturedScore,
    setLastCapturedScoreReason: mockSetLastCapturedScoreReason,
    setLastCapturedUri: mockSetLastCapturedUri,
    recognizeSceneTag: mockRecognizeSceneTag,
    takePicture: mockTakePicture,
    runAnalysis: mockRunAnalysis,
    savePhotoToGallery: mockSavePhotoToGallery,
    computeScoreFromSuggestions: mockComputeScoreFromSuggestions,
    requestLocation: mockRequestLocation,
    locationName: null,
    coords: null,
    addEntry: jest.fn(),
    saveFavorite: mockSaveFavorite,
    showToast: mockShowToast,
    countdownActive: false,
    loading: false,
    burstActive: false,
    startCountdown: mockStartCountdown,
    capturePreviewFrame: mockCapturePreviewFrame,
    lastCapturedBase64Ref: { current: null as string | null },
    lastCapturedUri: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Initial state ─────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('returns all required functions', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions()));
    expect(typeof result.current.doCapture).toBe('function');
    expect(typeof result.current.handleSaveToFavorites).toBe('function');
    expect(typeof result.current.handleGallery).toBe('function');
    expect(typeof result.current.handleGridActivate).toBe('function');
    expect(typeof result.current.handleAskAI).toBe('function');
    expect(typeof result.current.handleQuickCapture).toBe('function');
    expect(typeof result.current.captureMetadataRef).toBe('object');
  });

  it('captureMetadataRef starts with correct defaults', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions()));
    expect(result.current.captureMetadataRef.current.gridType).toBe('三分法');
    expect(result.current.captureMetadataRef.current.suggestions).toEqual([]);
  });
});

// ─── handleGridActivate ────────────────────────────────────────────────────────

describe('handleGridActivate', () => {
  it('cycles thirds → golden → diagonal → spiral → none → thirds', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ defaultGridVariant: 'thirds' })));

    act(() => { result.current.handleGridActivate('thirds'); });
    expect(mockSetDefaultGridVariant).toHaveBeenCalledWith('golden');

    act(() => { result.current.handleGridActivate('golden'); });
    expect(mockSetDefaultGridVariant).toHaveBeenCalledWith('diagonal');

    act(() => { result.current.handleGridActivate('diagonal'); });
    expect(mockSetDefaultGridVariant).toHaveBeenCalledWith('spiral');

    act(() => { result.current.handleGridActivate('spiral'); });
    expect(mockSetDefaultGridVariant).toHaveBeenCalledWith('none');

    act(() => { result.current.handleGridActivate('none'); });
    expect(mockSetDefaultGridVariant).toHaveBeenCalledWith('thirds');
  });
});

// ─── doCapture ───────────────────────────────────────────────────────────────

describe('doCapture', () => {
  it('calls takePicture with rawMode, saves photo, computes score', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '构图优秀' });
    mockRecognizeSceneTag.mockResolvedValue('风景');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockTakePicture).toHaveBeenCalledWith(false);
    expect(mockSavePhotoToGallery).toHaveBeenCalledWith('file:///photo.jpg');
    expect(mockComputeScoreFromSuggestions).toHaveBeenCalledWith(['建议1', '建议2']);
    expect(mockSetLastCapturedScore).toHaveBeenCalledWith(85);
    expect(mockSetLastCapturedScoreReason).toHaveBeenCalledWith('构图优秀');
    expect(mockSetLastCapturedUri).toHaveBeenCalledWith('file:///photo.jpg');
    expect(mockRequestLocation).toHaveBeenCalled();
  });

  it('passes rawMode=true to takePicture when rawMode option is set', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'raw64', uri: 'file:///raw.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 80, reason: 'RAW' });
    mockRecognizeSceneTag.mockResolvedValue('夜景');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions({ rawMode: true })));

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockTakePicture).toHaveBeenCalledWith(true);
  });

  it('returns early with error suggestion when takePicture returns null', async () => {
    mockTakePicture.mockResolvedValue(null);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    expect(mockSetSuggestions).toHaveBeenCalledWith(['错误: 无法获取相机画面']);
    expect(mockSetLoading).toHaveBeenCalledWith(false);
    expect(mockSavePhotoToGallery).not.toHaveBeenCalled();
  });

  it('skips AI analysis when skipAnalysis=true', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '构图优秀' });

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture(true);
    });

    expect(mockRecognizeSceneTag).not.toHaveBeenCalled();
    expect(mockRunAnalysis).not.toHaveBeenCalled();
    expect(mockSetLoading).toHaveBeenCalledWith(false);
  });

  it('updates captureMetadataRef with capture data after flush', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 90, reason: '绝佳' });
    mockRecognizeSceneTag.mockResolvedValue('人像');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ sceneTag: '人像', timerDuration: 5, defaultGridVariant: 'golden' }))
    );

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current).toMatchObject({
      gridType: '黄金分割',
      score: 90,
      scoreReason: '绝佳',
      sceneTag: '人像',
      timerDuration: 5,
      suggestions: ['建议1', '建议2'],
    });
  });

  it('calls recognizeSceneTag with base64 data', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'sceneBase64', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 75, reason: 'ok' });
    mockRecognizeSceneTag.mockResolvedValue('建筑');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockRecognizeSceneTag).toHaveBeenCalledWith('sceneBase64');
  });

  it('triggers burst suggestion via setShowBurstSuggestion when detectBurstMoment returns true', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'burst64', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 95, reason: '精彩' });
    mockRecognizeSceneTag.mockResolvedValue('运动');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockSetShowBurstSuggestion).toHaveBeenCalledWith(true);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);
  });

  it('does not trigger burst suggestion when detectBurstMoment returns false', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'normal64', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 60, reason: '一般' });
    mockRecognizeSceneTag.mockResolvedValue('室内');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockSetShowBurstSuggestion).not.toHaveBeenCalled();
  });
});

// ─── handleQuickCapture ──────────────────────────────────────────────────────

describe('handleQuickCapture', () => {
  it('returns early when countdownActive is true', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ countdownActive: true })));

    act(() => {
      result.current.handleQuickCapture();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockTakePicture).not.toHaveBeenCalled();
  });

  it('returns early when loading is true', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ loading: true })));

    act(() => {
      result.current.handleQuickCapture();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('returns early when burstActive is true', () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ burstActive: true })));

    act(() => {
      result.current.handleQuickCapture();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows toast and calls doCapture with skipAnalysis=true', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'fast64', uri: 'file:///quick.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 75, reason: '良好' });
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      result.current.handleQuickCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockShowToast).toHaveBeenCalledWith('⚡ 快速拍摄');
    // doCapture(true) skips analysis
    expect(mockRunAnalysis).not.toHaveBeenCalled();
    expect(mockTakePicture).toHaveBeenCalledWith(false);
  });
});

// ─── handleSaveToFavorites ────────────────────────────────────────────────────

describe('handleSaveToFavorites', () => {
  it('returns early when lastCapturedUri is null', async () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ lastCapturedUri: null })));

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockSaveFavorite).not.toHaveBeenCalled();
    expect((loadApiConfig as jest.Mock)).not.toHaveBeenCalled();
  });

  it('loads API config when saving with a valid lastCapturedUri', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'test-key' });
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 80, reason: '不错' });
    mockRecognizeSceneTag.mockResolvedValue('建筑');
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(loadApiConfig).toHaveBeenCalled();
  });

  it('recognizes scene tag when config is available and base64 exists', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'test-key' });
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 80, reason: '不错' });
    mockRecognizeSceneTag.mockResolvedValue('人像');
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({
        lastCapturedUri: 'file:///captured.jpg',
        lastCapturedBase64Ref: { current: 'b64data' },
      }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockRecognizeSceneTag).toHaveBeenCalled();
  });

  it('calls saveFavorite with correct arguments when lastCapturedUri is set', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue({});
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 80, reason: '不错' });
    mockRecognizeSceneTag.mockResolvedValue('建筑');
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockSaveFavorite).toHaveBeenCalledWith(
      'file:///captured.jpg',
      '三分法',
      '',
      undefined,
      80,
      '不错'
    );
    expect(mockShowToast).toHaveBeenCalledWith('已收藏！');
  });

  it('proceeds with empty tag when API config is not available', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue(null);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 70, reason: '还行' });
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockRecognizeSceneTag).not.toHaveBeenCalled();
    expect(mockSaveFavorite).toHaveBeenCalled();
  });

  // Skipped: loadApiConfig rejection propagates uncaught — not explicitly caught in hook
  it('proceeds when loadApiConfig rejects', async () => {
    (loadApiConfig as jest.Mock).mockRejectedValue(new Error('config unavailable'));
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 70, reason: '还行' });
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockSaveFavorite).toHaveBeenCalled();
  });
});

// ─── handleGallery ───────────────────────────────────────────────────────────

describe('handleGallery', () => {
  it('returns early when permission not granted', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('returns early when image picker is canceled', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(mockRunAnalysis).not.toHaveBeenCalled();
  });

  it('resizes image via expo-image-manipulator and reads base64', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///gallery.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file:///resized.jpg' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('A'.repeat(2000));
    mockRunAnalysis.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///gallery.jpg',
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: 'jpeg' }
    );
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///resized.jpg', { encoding: 'base64' });
  });

  it('falls back to direct readAsStringAsync when manipulateAsync fails', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///gallery2.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('B'.repeat(2000));
    mockRunAnalysis.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///gallery2.jpg', { encoding: 'base64' });
    expect(mockRunAnalysis).toHaveBeenCalled();
  });

  it('sets error suggestion when FileSystem read fails', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///bad.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('read failed'));

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(mockSetSuggestions).toHaveBeenCalledWith(['错误: 无法读取图片']);
  });

  it('sets error suggestion when base64 is too short', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tiny.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file:///resized.jpg' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('short');

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(mockSetSuggestions).toHaveBeenCalledWith(['错误: 图片数据异常']);
  });

  it('calls runAnalysis with base64 on successful gallery read', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///good.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file:///resized.jpg' });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('A'.repeat(2000));
    mockRunAnalysis.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockRunAnalysis).toHaveBeenCalledWith('A'.repeat(2000));
  });
});

// ─── handleAskAI ──────────────────────────────────────────────────────────────

describe('handleAskAI', () => {
  it('returns early when countdownActive is true', async () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ countdownActive: true })));

    await act(async () => {
      await result.current.handleAskAI();
    });

    expect(mockSetLoading).not.toHaveBeenCalled();
    expect(mockStartCountdown).not.toHaveBeenCalled();
  });

  it('returns early when loading is true', async () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ loading: true })));

    await act(async () => {
      await result.current.handleAskAI();
    });

    expect(mockStartCountdown).not.toHaveBeenCalled();
  });

  it('returns early when burstActive is true', async () => {
    const { result } = renderHook(() => useCaptureFlow(makeOptions({ burstActive: true })));

    await act(async () => {
      await result.current.handleAskAI();
    });

    expect(mockStartCountdown).not.toHaveBeenCalled();
  });

  it('sets loading true, captures preview, runs analysis, starts countdown', async () => {
    mockCapturePreviewFrame.mockResolvedValue({ base64: 'preview64', uri: 'file:///preview.jpg' });
    mockRunAnalysis.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCaptureFlow(makeOptions({ timerDuration: 5 })));

    await act(async () => {
      await result.current.handleAskAI();
    });

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockCapturePreviewFrame).toHaveBeenCalled();
    expect(mockRunAnalysis).toHaveBeenCalled();
    expect(mockStartCountdown).toHaveBeenCalledWith(5);
  });

  it('handles capturePreviewFrame throwing gracefully', async () => {
    mockCapturePreviewFrame.mockRejectedValue(new Error('no camera'));

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleAskAI();
    });

    // Should not throw — startCountdown still called
    expect(mockStartCountdown).toHaveBeenCalled();
  });
});

// ─── Options passthrough ──────────────────────────────────────────────────────

describe('options passthrough', () => {
  it('uses provided defaultGridVariant in captureMetadata', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'x', uri: 'file:///p.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '好' });
    mockRecognizeSceneTag.mockResolvedValue('风景');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ defaultGridVariant: 'golden' }))
    );

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current.gridType).toBe('黄金分割');
  });

  it('uses provided sceneTag in captureMetadata', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'x', uri: 'file:///p.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '好' });
    mockRecognizeSceneTag.mockResolvedValue('星空');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ sceneTag: '星空' }))
    );

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current.sceneTag).toBe('星空');
  });

  it('uses provided timerDuration in captureMetadata', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'x', uri: 'file:///p.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '好' });
    mockRecognizeSceneTag.mockResolvedValue('风光');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ timerDuration: 10 }))
    );

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current.timerDuration).toBe(10);
  });

  it('uses provided suggestions in captureMetadata', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'x', uri: 'file:///p.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 90, reason: '很棒' });
    mockRecognizeSceneTag.mockResolvedValue('风光');
    mockRunAnalysis.mockResolvedValue(undefined);
    (detectBurstMoment as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ suggestions: ['自定义建议A', '自定义建议B'] }))
    );

    await act(async () => {
      await result.current.doCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current.suggestions).toEqual(['自定义建议A', '自定义建议B']);
  });
});

// ─── Error handling — missing API config ──────────────────────────────────────

describe('error handling — missing API config', () => {
  it('handleSaveToFavorites proceeds when loadApiConfig returns null', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue(null);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 70, reason: '还行' });
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockSaveFavorite).toHaveBeenCalled();
  });

  // Skipped: same as above
  it('handleSaveToFavorites proceeds when loadApiConfig rejects', async () => {
    (loadApiConfig as jest.Mock).mockRejectedValue(new Error('config unavailable'));
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 70, reason: '还行' });
    mockSaveFavorite.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCaptureFlow(makeOptions({ lastCapturedUri: 'file:///captured.jpg' }))
    );

    await act(async () => {
      await result.current.handleSaveToFavorites();
    });

    expect(mockSaveFavorite).toHaveBeenCalled();
  });
});

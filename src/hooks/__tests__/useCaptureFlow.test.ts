import { renderHook, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Platform from 'react-native';

import { useCaptureFlow } from '../useCaptureFlow';
import { detectBurstMoment } from '../../components/BurstSuggestionOverlay';
import { loadApiConfig } from '../../services/api';

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

jest.mock('../../services/api', () => ({
  loadApiConfig: jest.fn(),
}));

jest.mock('../../components/BurstSuggestionOverlay', () => ({
  detectBurstMoment: jest.fn(),
}));

jest.spyOn(Platform, 'Platform', 'get').mockReturnValue({ OS: 'ios', select: jest.fn((obj: any) => obj.ios), isPad: false, isTV: false, isVision: false, constants: {}, Version: 1 });

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

// ─── Default options ───────────────────────────────────────────────────────────

function makeOptions(overrides = {}) {
  return {
    cameraReady: true,
    defaultGridVariant: 'thirds' as const,
    setDefaultGridVariant: mockSetDefaultGridVariant,
    timerDuration: 3 as const,
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

// ─── doCapture ───────────────────────────────────────────────────────────────

describe('doCapture', () => {
  it('calls takePicture, savePhotoToGallery, and computeScoreFromSuggestions on successful capture', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 85, reason: '构图优秀' });
    mockRecognizeSceneTag.mockResolvedValue('风景');
    mockRunAnalysis.mockResolvedValue(undefined);
    detectBurstMoment.mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.doCapture();
    });

    // Flush the setTimeout that detects burst moments
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

  it('sets error suggestion and returns early when takePicture returns null', async () => {
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

  it('updates captureMetadataRef after capture (after setTimeout flush)', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 90, reason: '绝佳' });
    mockRecognizeSceneTag.mockResolvedValue('人像');
    mockRunAnalysis.mockResolvedValue(undefined);
    detectBurstMoment.mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions({ sceneTag: '人像', timerDuration: 5 })));

    await act(async () => {
      await result.current.doCapture();
    });

    // Flush the setTimeout(100) inside doCapture before checking refs
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.captureMetadataRef.current).toMatchObject({
      gridType: '三分法',
      score: 90,
      scoreReason: '绝佳',
      sceneTag: '人像',
      timerDuration: 5,
      suggestions: ['建议1', '建议2'],
    });
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

    // Note: tag is '' because recognizeSceneTag result is intentionally discarded in the hook
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
});

// ─── handleGallery ────────────────────────────────────────────────────────────

describe('handleGallery', () => {
  it('returns early when permission not granted', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('calls runAnalysis on successful image selection', async () => {
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

    // Flush microtasks from the async manipulateAsync -> readAsStringAsync chain
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockRunAnalysis).toHaveBeenCalled();
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///gallery.jpg',
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: 'jpeg' }
    );
  });

  it('sets error suggestion when image read fails', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///gallery.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('read failed'));

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      await result.current.handleGallery();
    });

    expect(mockSetSuggestions).toHaveBeenCalledWith(['错误: 无法读取图片']);
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

  it('starts countdown and calls runAnalysis in normal case', async () => {
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

  it('shows toast and calls doCapture(true) in normal case', async () => {
    mockTakePicture.mockResolvedValue({ base64: 'fast64', uri: 'file:///quick.jpg' });
    mockSavePhotoToGallery.mockResolvedValue(undefined);
    mockComputeScoreFromSuggestions.mockReturnValue({ score: 75, reason: '良好' });
    detectBurstMoment.mockReturnValue(false);

    const { result } = renderHook(() => useCaptureFlow(makeOptions()));

    await act(async () => {
      result.current.handleQuickCapture();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(mockShowToast).toHaveBeenCalledWith('⚡ 快速拍摄');
    expect(mockTakePicture).toHaveBeenCalledWith(false);
  });
});
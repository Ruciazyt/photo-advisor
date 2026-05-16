/**
 * Unit tests for src/hooks/useCameraCapture.ts
 *
 * Mocks: expo-camera, expo-file-system/legacy, expo-image-manipulator,
 *        expo-media-library, services/api, services/settings,
 *        services/camera2, react-native (Platform, Alert, NativeModules)
 *        components/KeypointOverlay (bubbleTextToKeypoint)
 */

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  loadApiConfig: jest.fn(),
  streamChatCompletion: jest.fn(),
  analyzeImageAnthropic: jest.fn(),
}));

jest.mock('../../services/settings', () => ({
  loadAppSettings: jest.fn(),
}));

jest.mock('../../services/camera2', () => ({
  supportsRawCapture: jest.fn(() => Promise.resolve(true)),
  captureRawNative: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    Camera2RawModule: {
      supportsRAW: jest.fn(),
      captureRAW: jest.fn(),
    },
  },
  Alert: { alert: jest.fn() },
}));

jest.mock('../../components/KeypointOverlay', () => ({
  KeypointOverlay: 'KeypointOverlay',
  bubbleTextToKeypoint: jest.fn().mockReturnValue(null),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useCameraCapture } from '../useCameraCapture';
import { getImageQualitySettings, parseSuggestions } from '../useCameraCapture';

const FileSystem = require('expo-file-system/legacy');
const { manipulateAsync } = require('expo-image-manipulator');
const MediaLibrary = require('expo-media-library');
const { loadApiConfig, streamChatCompletion, analyzeImageAnthropic } = require('../../services/api');
const { loadAppSettings } = require('../../services/settings');

const renderUseCameraCapture = (extraProps = {}) =>
  renderHook(() =>
    useCameraCapture({
      cameraRef: { current: null },
      cameraReady: false,
      onSuggestionsChange: jest.fn(),
      onLoadingChange: jest.fn(),
      onKeypointsChange: jest.fn(),
      onShowKeypointsChange: jest.fn(),
      ...extraProps,
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
  FileSystem.readAsStringAsync.mockResolvedValue('A'.repeat(2000));
  manipulateAsync.mockResolvedValue({ uri: 'file:///resized.jpg' });
  MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  MediaLibrary.saveToLibraryAsync.mockResolvedValue(undefined);
  loadAppSettings.mockResolvedValue({ imageQualityPreset: 'balanced' });
  loadApiConfig.mockResolvedValue(null);
});

// ─── getImageQualitySettings ───────────────────────────────────────────────

describe('getImageQualitySettings', () => {
  it('returns { resizeWidth: 1024, compress: 0.7 } for size preset', () => {
    expect(getImageQualitySettings('size')).toEqual({ resizeWidth: 1024, compress: 0.7 });
  });

  it('returns { resizeWidth: 1536, compress: 0.8 } for balanced preset', () => {
    expect(getImageQualitySettings('balanced')).toEqual({ resizeWidth: 1536, compress: 0.8 });
  });

  it('returns { resizeWidth: 2048, compress: 0.9 } for quality preset', () => {
    expect(getImageQualitySettings('quality')).toEqual({ resizeWidth: 2048, compress: 0.9 });
  });
});

// ─── parseSuggestions ──────────────────────────────────────────────────────

describe('parseSuggestions', () => {
  it('returns { done: [], remaining: "" } for empty input', () => {
    expect(parseSuggestions('', '')).toEqual({ done: [], remaining: '' });
  });

  it('partial sentence without punctuation stays in remaining', () => {
    const result = parseSuggestions('', '这是一段不完整');
    expect(result).toEqual({ done: [], remaining: '这是一段不完整' });
  });

  it('splits on Chinese period (。)', () => {
    const result = parseSuggestions('', '第一句。第二句。');
    // pop() makes the last match the remaining; first match goes to done
    expect(result.done).toEqual(['第一句。']);
    expect(result.remaining).toBe('第二句。');
  });

  it('splits on Chinese exclamation (！)', () => {
    const result = parseSuggestions('', '短！这是更长的句子！');
    // pop() takes '这是更长的句子！' as remaining; '短！' (len=2, ≤3 → filtered)
    expect(result.done).toEqual([]);
    expect(result.remaining).toBe('这是更长的句子！');
  });

  it('splits on Chinese question mark (？)', () => {
    const result = parseSuggestions('', '问？答？');
    // pop() takes '答？' as remaining; '问？' (len=2, ≤3 → filtered)
    expect(result.done).toEqual([]);
    expect(result.remaining).toBe('答？');
  });

  it('splits on semicolon (；)', () => {
    const result = parseSuggestions('', '第一段；第二段；');
    // pop() takes '第二段；' as remaining
    expect(result.done).toEqual(['第一段；']);
    expect(result.remaining).toBe('第二段；');
  });

  it('splits on newline', () => {
    const result = parseSuggestions('', '第一行\n第二行\n');
    // pop() takes '第二行\n' as remaining; '第一行\n' trimmed='第一行' (len=3, ≤3 → filtered)
    expect(result.done).toEqual([]);
    expect(result.remaining).toBe('第二行\n');
  });

  it('last sentence-ending chunk stays as remaining (not in done)', () => {
    const result = parseSuggestions('', '第一句。第二句！');
    expect(result.done).toEqual(['第一句。']);
    expect(result.remaining).toBe('第二句！');
  });

  it('sentences with ≤3 characters after trim are filtered from done', () => {
    const result = parseSuggestions('', 'AB。很短！嗯？');
    expect(result.done).toEqual([]);
    expect(result.remaining).toBe('嗯？');
  });

  it('combines buffer with newChunk before splitting', () => {
    const result = parseSuggestions('已经完成。', '还在输入的内容');
    expect(result.done).toEqual(['已经完成。']);
    expect(result.remaining).toBe('还在输入的内容');
  });

  it('empty chunk preserves buffer in remaining', () => {
    const result = parseSuggestions('已有内容。', '');
    expect(result.done).toEqual([]);
    expect(result.remaining).toBe('已有内容。');
  });

  it('mixed Chinese punctuation and newlines', () => {
    const result = parseSuggestions('', '第一句。第二句\n第三句！');
    expect(result.done).toEqual(['第一句。']);
    expect(result.remaining).toBe('第三句！');
  });
});

// ─── takePicture ────────────────────────────────────────────────────────────

describe('takePicture', () => {
  it('returns null when cameraRef.current is null', async () => {
    const { result } = renderUseCameraCapture({ cameraRef: { current: null }, cameraReady: true });
    const output = await result.current.takePicture(false);
    expect(output).toBeNull();
  });

  it('returns null when cameraReady is false', async () => {
    const mockCamera = { takePictureAsync: jest.fn() };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: false });
    const output = await result.current.takePicture(false);
    expect(output).toBeNull();
    expect(mockCamera.takePictureAsync).not.toHaveBeenCalled();
  });

  it('returns null when photo.uri is missing', async () => {
    const mockCamera = { takePictureAsync: jest.fn().mockResolvedValue({ uri: undefined }) };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(false);
    expect(output).toBeNull();
  });

  it('JPEG path: returns { base64, uri } with correct quality from preset', async () => {
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'balanced' });
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(false);
    expect(output).toEqual({ base64: 'A'.repeat(2000), uri: 'file:///photo.jpg' });
    expect(mockCamera.takePictureAsync).toHaveBeenCalledWith({ quality: 0.8 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 1536 } }],
      { compress: 0.8, format: 'jpeg' }
    );
  });

  it('JPEG path: size preset maps to quality=0.7, resizeWidth=1024', async () => {
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'size' });
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    await result.current.takePicture(false);
    expect(mockCamera.takePictureAsync).toHaveBeenCalledWith({ quality: 0.7 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 1024 } }],
      { compress: 0.7, format: 'jpeg' }
    );
  });

  it('JPEG path: quality preset maps to quality=0.9, resizeWidth=2048', async () => {
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'quality' });
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    await result.current.takePicture(false);
    expect(mockCamera.takePictureAsync).toHaveBeenCalledWith({ quality: 0.9 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 2048 } }],
      { compress: 0.9, format: 'jpeg' }
    );
  });

  it('JPEG path: falls back to original when resized base64 < 1000 chars', async () => {
    // Test: resize succeeds but the resized image is too small (base64 < 1000 chars)
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };
    // First readAsStringAsync (resized image): short base64 → second readAsStringAsync (original): success
    FileSystem.readAsStringAsync
      .mockResolvedValueOnce('ABC') // resized base64 too short
      .mockResolvedValueOnce('B'.repeat(2000)); // original base64 is valid

    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(false);

    expect(output).toEqual({ base64: 'B'.repeat(2000), uri: 'file:///photo.jpg' });
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledTimes(2);
  });

  it('JPEG path: returns null when both resized and original base64 < 1000', async () => {
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };
    FileSystem.readAsStringAsync.mockResolvedValue('AB');

    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(false);
    expect(output).toBeNull();
  });

  it('JPEG path: returns null when takePictureAsync throws', async () => {
    const mockCamera = {
      takePictureAsync: jest.fn().mockRejectedValue(new Error('Camera error')),
    };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(false);
    expect(output).toBeNull();
  });

  it('RAW path: falls back to JPEG when captureRawNative returns null', async () => {
    const { captureRawNative } = require('../../services/camera2');
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'balanced' });
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///photo.jpg' }),
    };

    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.takePicture(true);

    expect(captureRawNative).toHaveBeenCalled();
    expect(mockCamera.takePictureAsync).toHaveBeenCalled();
    expect(output).toEqual({ base64: 'A'.repeat(2000), uri: 'file:///photo.jpg' });
  });
});

// ─── runAnalysis ───────────────────────────────────────────────────────────

describe('runAnalysis', () => {
  it('calls analyzeImageAnthropic when apiType is minimax', async () => {
    loadApiConfig.mockResolvedValue({ apiType: 'minimax', apiKey: 'test-key', model: 'claude-3', baseUrl: '' });
    analyzeImageAnthropic.mockImplementation(async (_b64, _key, _model, onChunk) => {
      onChunk('第一句完整的话。', false);
    });

    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64');

    expect(analyzeImageAnthropic).toHaveBeenCalledWith('test-base64', 'test-key', 'claude-3', expect.any(Function), undefined);
    expect(onLoadingChange).toHaveBeenCalledWith(true);
    expect(onLoadingChange).toHaveBeenCalledWith(false);
  });

  it('shows Alert when loadApiConfig returns null', async () => {
    loadApiConfig.mockResolvedValue(null);
    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64');

    const Alert = require('react-native').Alert;
    expect(Alert.alert).toHaveBeenCalledWith('请先在设置中配置API');
    expect(onLoadingChange).toHaveBeenCalledWith(false);
  });

  it('calls streamChatCompletion when apiType is openai', async () => {
    loadApiConfig.mockResolvedValue({ apiType: 'openai', apiKey: 'test-key', model: 'gpt-4', baseUrl: 'https://api.example.com' });
    streamChatCompletion.mockImplementation(async (_key, _url, _model, _b64, onChunk) => {
      onChunk('这是一段分析。', false);
      onChunk('', true);
    });

    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64');

    expect(streamChatCompletion).toHaveBeenCalledWith(
      'test-key',
      'https://api.example.com',
      'gpt-4',
      'test-base64',
      expect.any(Function),
      undefined
    );
    expect(onLoadingChange).toHaveBeenCalledWith(false);
  });

  it('passes extraPrompt to analyzeImageAnthropic when provided', async () => {
    loadApiConfig.mockResolvedValue({ apiType: 'minimax', apiKey: 'test-key', model: 'claude-3', baseUrl: '' });
    analyzeImageAnthropic.mockImplementation(async () => {});

    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64', '请重点关注构图');

    expect(analyzeImageAnthropic).toHaveBeenCalledWith(
      'test-base64', 'test-key', 'claude-3', expect.any(Function), '请重点关注构图'
    );
  });

  it('passes extraPrompt to streamChatCompletion when provided', async () => {
    loadApiConfig.mockResolvedValue({ apiType: 'openai', apiKey: 'test-key', model: 'gpt-4', baseUrl: 'https://api.example.com' });
    streamChatCompletion.mockImplementation(async () => {});

    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64', '重点看光线');

    expect(streamChatCompletion).toHaveBeenCalledWith(
      'test-key', 'https://api.example.com', 'gpt-4', 'test-base64', expect.any(Function), '重点看光线'
    );
  });

  it('handles API error: sets loading false and shows error in suggestions', async () => {
    loadApiConfig.mockResolvedValue({ apiType: 'minimax', apiKey: 'test-key', model: 'claude-3', baseUrl: '' });
    analyzeImageAnthropic.mockRejectedValue(new Error('network error'));

    const onSuggestionsChange = jest.fn();
    const onLoadingChange = jest.fn();
    const { result } = renderUseCameraCapture({ onSuggestionsChange, onLoadingChange });
    await result.current.runAnalysis('test-base64');

    expect(onLoadingChange).toHaveBeenCalledWith(false);
    expect(onSuggestionsChange).toHaveBeenCalledWith([expect.stringContaining('network error')]);
  });
});

// ─── savePhotoToGallery ────────────────────────────────────────────────────

describe('savePhotoToGallery', () => {
  it('saves to library when permission granted', async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    MediaLibrary.saveToLibraryAsync.mockResolvedValue(undefined);
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'balanced' });

    const { result } = renderUseCameraCapture();
    await result.current.savePhotoToGallery('file:///original.jpg');

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///original.jpg',
      [{ resize: { width: 1536 } }],
      { compress: 0.8, format: 'jpeg' }
    );
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///resized.jpg');
  });

  it('does not save when permission denied', async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { result } = renderUseCameraCapture();
    await result.current.savePhotoToGallery('file:///original.jpg');
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });

  it('swallows error when manipulateAsync throws', async () => {
    MediaLibrary.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    manipulateAsync.mockRejectedValue(new Error('resize failed'));
    loadAppSettings.mockResolvedValue({ imageQualityPreset: 'balanced' });

    const { result } = renderUseCameraCapture();
    await expect(result.current.savePhotoToGallery('file:///original.jpg')).resolves.not.toThrow();
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });
});

// ─── capturePreviewFrame ───────────────────────────────────────────────────

describe('capturePreviewFrame', () => {
  it('returns { base64, uri } when cameraRef and cameraReady are set', async () => {
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///preview.jpg' }),
    };
    FileSystem.readAsStringAsync.mockResolvedValue('A'.repeat(600));
    manipulateAsync.mockResolvedValue({ uri: 'file:///resized.jpg' });

    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.capturePreviewFrame();

    expect(output).toEqual({ base64: 'A'.repeat(600), uri: 'file:///resized.jpg' });
    expect(mockCamera.takePictureAsync).toHaveBeenCalledWith({ quality: 0.4 });
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///preview.jpg',
      [{ resize: { width: 480 } }],
      { compress: 0.5, format: 'jpeg' }
    );
  });

  it('returns null when cameraRef.current is null', async () => {
    const { result } = renderUseCameraCapture({ cameraRef: { current: null }, cameraReady: true });
    const output = await result.current.capturePreviewFrame();
    expect(output).toBeNull();
  });

  it('returns null when cameraReady is false', async () => {
    const mockCamera = { takePictureAsync: jest.fn() };
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: false });
    const output = await result.current.capturePreviewFrame();
    expect(output).toBeNull();
  });

  it('returns null when base64.length < 500', async () => {
    const mockCamera = {
      takePictureAsync: jest.fn().mockResolvedValue({ uri: 'file:///preview.jpg' }),
    };
    FileSystem.readAsStringAsync.mockResolvedValue('AB');
    const { result } = renderUseCameraCapture({ cameraRef: { current: mockCamera }, cameraReady: true });
    const output = await result.current.capturePreviewFrame();
    expect(output).toBeNull();
  });
});
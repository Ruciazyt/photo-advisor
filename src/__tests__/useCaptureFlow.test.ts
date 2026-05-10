/**
 * Tests for src/hooks/useCaptureFlow.ts
 *
 * Covers: initial state, handleGridActivate, handleQuickCapture,
 * handleSaveToFavorites, handleGallery, options passthrough, error handling.
 */

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
}));

jest.mock('expo-modules-core', () => ({}));

jest.mock('../services/api', () => ({
  loadApiConfig: jest.fn(),
}));

jest.mock('../components/BurstSuggestionOverlay', () => ({
  detectBurstMoment: jest.fn(),
}));

jest.mock('../services/settings', () => ({
  saveAppSettings: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { loadApiConfig } from '../services/api';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { useCaptureFlow } from '../hooks/useCaptureFlow';
import type { GridVariant } from '../types';

// ─── Default options factory ─────────────────────────────────────────────────

function makeOptions(overrides = {}) {
  const setDefaultGridVariant = jest.fn();
  const setSuggestions = jest.fn();
  const setLoading = jest.fn();
  const setShowBurstSuggestion = jest.fn();
  const setLastCapturedScore = jest.fn();
  const setLastCapturedScoreReason = jest.fn();
  const setLastCapturedUri = jest.fn();

  const defaults = {
    defaultGridVariant: 'thirds' as GridVariant,
    setDefaultGridVariant,
    timerDuration: 3,
    rawMode: false,
    suggestions: ['不错', '光线好'],
    sceneTag: '风光',
    setSuggestions,
    setLoading,
    setShowBurstSuggestion,
    burstSuggestionText: { current: '' },
    setLastCapturedScore,
    setLastCapturedScoreReason,
    setLastCapturedUri,
    recognizeSceneTag: jest.fn().mockResolvedValue('人像'),
    takePicture: jest.fn().mockResolvedValue({ base64: 'abc123', uri: 'file:///photo.jpg' }),
    runAnalysis: jest.fn().mockResolvedValue(undefined),
    savePhotoToGallery: jest.fn().mockResolvedValue(undefined),
    computeScoreFromSuggestions: jest.fn().mockReturnValue({ score: 85, reason: '构图不错' }),
    requestLocation: jest.fn(),
    locationName: '杭州',
    coords: { latitude: 30.27, longitude: 120.15 },
    addEntry: jest.fn(),
    saveFavorite: jest.fn().mockResolvedValue(undefined),
    showToast: jest.fn(),
    countdownActive: false,
    loading: false,
    burstActive: false,
    startCountdown: jest.fn(),
    capturePreviewFrame: jest.fn().mockResolvedValue({ base64: 'preview64', uri: 'file:///preview.jpg' }),
    lastCapturedBase64Ref: { current: null as string | null },
    lastCapturedUri: null as string | null,
  };

  return { ...defaults, ...overrides, setDefaultGridVariant, setSuggestions, setLoading, setShowBurstSuggestion, setLastCapturedScore, setLastCapturedScoreReason, setLastCapturedUri };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useCaptureFlow', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (detectBurstMoment as jest.Mock).mockReturnValue(false);
  });

  describe('initial state', () => {
    it('returns doCapture as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.doCapture).toBe('function');
    });

    it('returns handleSaveToFavorites as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.handleSaveToFavorites).toBe('function');
    });

    it('returns handleGallery as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.handleGallery).toBe('function');
    });

    it('returns handleGridActivate as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.handleGridActivate).toBe('function');
    });

    it('returns handleAskAI as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.handleAskAI).toBe('function');
    });

    it('returns handleQuickCapture as a function', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(typeof result.current.handleQuickCapture).toBe('function');
    });

    it('returns captureMetadataRef as a ref object', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(result.current.captureMetadataRef).toHaveProperty('current');
      expect(typeof result.current.captureMetadataRef.current).toBe('object');
    });

    it('captureMetadataRef.current has gridType and suggestions fields', () => {
      const { result } = renderHook(() => useCaptureFlow(makeOptions()));
      expect(result.current.captureMetadataRef.current).toHaveProperty('gridType');
      expect(result.current.captureMetadataRef.current).toHaveProperty('suggestions');
    });
  });

  describe('handleGridActivate', () => {
    it('cycles thirds → golden', () => {
      const options = makeOptions({ defaultGridVariant: 'thirds' });
      const { result } = renderHook(() => useCaptureFlow(options));
      act(() => { result.current.handleGridActivate('thirds'); });
      expect(options.setDefaultGridVariant).toHaveBeenCalledWith('golden');
    });

    it('cycles golden → diagonal', () => {
      const options = makeOptions({ defaultGridVariant: 'golden' });
      const { result } = renderHook(() => useCaptureFlow(options));
      act(() => { result.current.handleGridActivate('golden'); });
      expect(options.setDefaultGridVariant).toHaveBeenCalledWith('diagonal');
    });

    it('cycles diagonal → spiral', () => {
      const options = makeOptions({ defaultGridVariant: 'diagonal' });
      const { result } = renderHook(() => useCaptureFlow(options));
      act(() => { result.current.handleGridActivate('diagonal'); });
      expect(options.setDefaultGridVariant).toHaveBeenCalledWith('spiral');
    });

    it('cycles spiral → none', () => {
      const options = makeOptions({ defaultGridVariant: 'spiral' });
      const { result } = renderHook(() => useCaptureFlow(options));
      act(() => { result.current.handleGridActivate('spiral'); });
      expect(options.setDefaultGridVariant).toHaveBeenCalledWith('none');
    });

    it('cycles none → thirds (wraps around)', () => {
      const options = makeOptions({ defaultGridVariant: 'none' });
      const { result } = renderHook(() => useCaptureFlow(options));
      act(() => { result.current.handleGridActivate('none'); });
      expect(options.setDefaultGridVariant).toHaveBeenCalledWith('thirds');
    });
  });

  describe('handleQuickCapture', () => {
    it('shows toast and calls doCapture(true)', async () => {
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleQuickCapture(); });

      expect(options.showToast).toHaveBeenCalledWith('⚡ 快速拍摄');
      expect(options.takePicture).toHaveBeenCalled();
    });

    it('guards against countdownActive', async () => {
      const options = makeOptions({ countdownActive: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleQuickCapture(); });

      expect(options.showToast).not.toHaveBeenCalled();
      expect(options.takePicture).not.toHaveBeenCalled();
    });

    it('guards against loading', async () => {
      const options = makeOptions({ loading: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleQuickCapture(); });

      expect(options.showToast).not.toHaveBeenCalled();
      expect(options.takePicture).not.toHaveBeenCalled();
    });

    it('guards against burstActive', async () => {
      const options = makeOptions({ burstActive: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleQuickCapture(); });

      expect(options.showToast).not.toHaveBeenCalled();
      expect(options.takePicture).not.toHaveBeenCalled();
    });
  });

  describe('handleSaveToFavorites', () => {
    it('returns early when lastCapturedUri is null', async () => {
      const options = makeOptions({ lastCapturedUri: null });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleSaveToFavorites(); });

      expect(options.saveFavorite).not.toHaveBeenCalled();
      expect(options.showToast).not.toHaveBeenCalled();
    });

    it('calls saveFavorite with correct grid label', async () => {
      const options = makeOptions({
        lastCapturedUri: 'file:///photo.jpg',
        lastCapturedBase64Ref: { current: 'abc123' },
        defaultGridVariant: 'golden',
        suggestions: ['构图好'],
      });
      (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'sk-test' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleSaveToFavorites(); });

      expect(options.saveFavorite).toHaveBeenCalledWith(
        'file:///photo.jpg',
        '黄金分割',
        '',
        '人像',
        85,
        '构图不错'
      );
    });

    it('shows toast "正在识别场景..." when API config exists', async () => {
      const options = makeOptions({
        lastCapturedUri: 'file:///photo.jpg',
        lastCapturedBase64Ref: { current: 'abc123' },
        suggestions: ['好'],
      });
      (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'sk-test' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleSaveToFavorites(); });

      expect(options.showToast).toHaveBeenCalledWith('正在识别场景...');
    });

    it('shows toast "已收藏！" after saving', async () => {
      const options = makeOptions({
        lastCapturedUri: 'file:///photo.jpg',
        lastCapturedBase64Ref: { current: 'abc123' },
        suggestions: ['好'],
      });
      (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'sk-test' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleSaveToFavorites(); });

      // Toast called after scene recognition resolves
      await waitFor(() => {
        expect(options.showToast).toHaveBeenCalledWith('已收藏！');
      });
    });

    it('does not call recognizeSceneTag when lastCapturedBase64Ref is null', async () => {
      const options = makeOptions({
        lastCapturedUri: 'file:///photo.jpg',
        lastCapturedBase64Ref: { current: null },
        suggestions: ['好'],
      });
      (loadApiConfig as jest.Mock).mockResolvedValue({ apiKey: 'sk-test' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleSaveToFavorites(); });

      expect(options.recognizeSceneTag).not.toHaveBeenCalled();
    });
  });

  describe('handleGallery', () => {
    it('returns early when media permission denied', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleGallery(); });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('returns early when image picker is canceled', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleGallery(); });

      expect(options.runAnalysis).not.toHaveBeenCalled();
    });

    it('sets error suggestion when image uri is missing', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: '' }] });
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleGallery(); });

      expect(options.setSuggestions).toHaveBeenCalledWith(['错误: 无法读取图片']);
    });

    it('reads base64 from resized image and runs analysis', async () => {
      jest.useFakeTimers();
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///gallery.jpg' }],
      });
      (manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file:///resized.jpg' });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('A'.repeat(2000));
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleGallery(); });
      await act(async () => { jest.advanceTimersByTime(0); });

      expect(manipulateAsync).toHaveBeenCalledWith('file:///gallery.jpg', [{ resize: { width: 1024 } }], { compress: 0.8, format: SaveFormat.JPEG });
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///resized.jpg', { encoding: 'base64' });
      expect(options.runAnalysis).toHaveBeenCalledWith('A'.repeat(2000));
      jest.useRealTimers();
    });

    it('falls back to reading original uri when resize fails', async () => {
      jest.useFakeTimers();
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///gallery.jpg' }],
      });
      (manipulateAsync as jest.Mock).mockRejectedValue(new Error('resize failed'));
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('A'.repeat(2000));
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleGallery(); });
      await act(async () => { jest.advanceTimersByTime(0); });

      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file:///gallery.jpg', { encoding: 'base64' });
      expect(options.runAnalysis).toHaveBeenCalledWith('A'.repeat(2000));
      jest.useRealTimers();
    });

    it('sets error when base64 is empty or too short', async () => {
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///gallery.jpg' }],
      });
      (manipulateAsync as jest.Mock).mockResolvedValue({ uri: 'file:///resized.jpg' });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('tiny');
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { result.current.handleGallery(); });

      expect(options.setSuggestions).toHaveBeenCalledWith(['错误: 图片数据异常']);
    });
  });

  describe('options passthrough', () => {
    it('passes timerDuration to captureMetadataRef on doCapture', async () => {
      const options = makeOptions({ timerDuration: 10 });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(true); });

      expect(result.current.captureMetadataRef.current.timerDuration).toBe(10);
    });

    it('passes sceneTag to captureMetadataRef on doCapture', async () => {
      const options = makeOptions({ sceneTag: '人像' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(true); });

      expect(result.current.captureMetadataRef.current.sceneTag).toBe('人像');
    });

    it('calls computeScoreFromSuggestions with current suggestions', async () => {
      const options = makeOptions({ suggestions: ['光线好', '构图不错'] });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(true); });

      expect(options.computeScoreFromSuggestions).toHaveBeenCalledWith(['光线好', '构图不错']);
    });

    it('calls requestLocation on doCapture', async () => {
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(true); });

      expect(options.requestLocation).toHaveBeenCalled();
    });

    it('uses rawMode option when calling takePicture', async () => {
      const options = makeOptions({ rawMode: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      expect(options.takePicture).toHaveBeenCalledWith(true);
    });

    it('uses non-raw mode when rawMode is false', async () => {
      const options = makeOptions({ rawMode: false });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      expect(options.takePicture).toHaveBeenCalledWith(false);
    });
  });

  describe('doCapture error handling', () => {
    it('sets error suggestion and returns early when takePicture returns null', async () => {
      const options = makeOptions({ takePicture: jest.fn().mockResolvedValue(null) });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      expect(options.setSuggestions).toHaveBeenCalledWith(['错误: 无法获取相机画面']);
      expect(options.runAnalysis).not.toHaveBeenCalled();
    });

    it('sets loading to false after takePicture returns null', async () => {
      const options = makeOptions({ takePicture: jest.fn().mockResolvedValue(null) });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      expect(options.setLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('burst detection', () => {
    it('shows burst suggestion when detectBurstMoment returns true', async () => {
      (detectBurstMoment as jest.Mock).mockReturnValue(true);
      const options = makeOptions({
        suggestions: ['完美照片'],
        burstSuggestionText: { current: '' },
      });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      // Wait for the setTimeout(100) inside doCapture
      await waitFor(() => {
        expect(options.setShowBurstSuggestion).toHaveBeenCalledWith(true);
      });
    });

    it('does not show burst suggestion when detectBurstMoment returns false', async () => {
      (detectBurstMoment as jest.Mock).mockReturnValue(false);
      const options = makeOptions({
        suggestions: ['普通照片'],
        burstSuggestionText: { current: '' },
      });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      // Wait for setTimeout to have fired
      await waitFor(() => {
        expect(options.setShowBurstSuggestion).not.toHaveBeenCalled();
      }, { timeout: 200 });
    });

    it('does not show burst suggestion when burstActive is true', async () => {
      (detectBurstMoment as jest.Mock).mockReturnValue(true);
      const options = makeOptions({
        suggestions: ['完美照片'],
        burstActive: true,
        burstSuggestionText: { current: '' },
      });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.doCapture(false); });

      await waitFor(() => {
        expect(options.setShowBurstSuggestion).not.toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe('handleAskAI', () => {
    it('guards against countdownActive', async () => {
      const options = makeOptions({ countdownActive: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.startCountdown).not.toHaveBeenCalled();
    });

    it('guards against loading', async () => {
      const options = makeOptions({ loading: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.startCountdown).not.toHaveBeenCalled();
    });

    it('guards against burstActive', async () => {
      const options = makeOptions({ burstActive: true });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.startCountdown).not.toHaveBeenCalled();
    });

    it('calls capturePreviewFrame and startCountdown', async () => {
      const options = makeOptions({ timerDuration: 5 });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.capturePreviewFrame).toHaveBeenCalled();
      expect(options.startCountdown).toHaveBeenCalledWith(5);
    });

    it('calls runAnalysis with grid prompt from current defaultGridVariant', async () => {
      const options = makeOptions({ defaultGridVariant: 'golden' });
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.runAnalysis).toHaveBeenCalledWith(
        'preview64',
        '画面已叠加黄金分割网格参考线。请根据网格线区域提供构图位置建议。'
      );
    });

    it('sets loading to true', async () => {
      const options = makeOptions();
      const { result } = renderHook(() => useCaptureFlow(options));

      await act(async () => { await result.current.handleAskAI(); });

      expect(options.setLoading).toHaveBeenCalledWith(true);
    });
  });

});

/**
 * useCaptureFlow — encapsulates all capture-related callbacks and their state.
 *
 * Responsibilities:
 * - Main capture flow: doCapture, handleSaveToFavorites, handleGallery
 * - Grid cycling: handleGridActivate
 * - AI ask flow: handleAskAI, handleQuickCapture
 * - Internal refs for shoot-log capture metadata
 */

import { useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { CameraView } from 'expo-camera';
import type { GridVariant } from '../types';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { loadApiConfig } from '../services/api';
import type { ShootLogEntry, TimerDuration } from '../types';

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

const GRID_PROMPT_MAP: Record<GridVariant, string> = {
  thirds: '三分法网格', golden: '黄金分割网格', diagonal: '对角线网格', spiral: '螺旋线网格', none: '无网格',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

export interface UseCaptureFlowOptions {
  defaultGridVariant: GridVariant;
  setDefaultGridVariant: (v: GridVariant) => unknown;
  timerDuration: TimerDuration;
  rawMode: boolean;
  suggestions: string[];
  sceneTag: string;
  setSuggestions: SetState<string[]>;
  setLoading: (v: boolean) => void;
  setShowBurstSuggestion: (v: boolean) => void;
  burstSuggestionText: React.MutableRefObject<string>;
  setLastCapturedScore: SetState<number | null>;
  setLastCapturedScoreReason: SetState<string | null>;
  setLastCapturedUri: SetState<string | null>;
  recognizeSceneTag: (base64: string) => Promise<string>;
  takePicture: (raw?: boolean) => Promise<{ base64: string; uri: string } | null>;
  runAnalysis: (base64: string, extraPrompt?: string) => Promise<void>;
  savePhotoToGallery: (uri: string) => Promise<void>;
  computeScoreFromSuggestions: (suggestions: string[]) => { score: number; reason: string };
  requestLocation: () => void;
  locationName: string | null;
  coords: { latitude: number; longitude: number } | null;
  addEntry: (entry: Omit<ShootLogEntry, 'id' | 'date'>) => void;
  saveFavorite: (uri: string, gridType: string, suggestion?: string, sceneTag?: string, score?: number, scoreReason?: string) => Promise<unknown>;
  showToast: (msg: string) => void;
  countdownActive: boolean;
  loading: boolean;
  burstActive: boolean;
  startCountdown: (duration: TimerDuration) => void;
  capturePreviewFrame: () => Promise<{ base64: string; uri: string } | null>;
  lastCapturedBase64Ref: React.MutableRefObject<string | null>;
  lastCapturedUri: string | null;
}

export interface UseCaptureFlowReturn {
  doCapture: (skipAnalysis?: boolean) => Promise<void>;
  handleSaveToFavorites: () => Promise<void>;
  handleGallery: () => Promise<void>;
  handleGridActivate: (variant: GridVariant) => void;
  handleAskAI: () => Promise<void>;
  handleQuickCapture: () => void;
  /** Snapshot of captured metadata at last doCapture call — for shoot-log useEffect in CameraScreen */
  captureMetadataRef: React.MutableRefObject<{
    gridType: string;
    score?: number;
    scoreReason?: string;
    sceneTag?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    timerDuration?: number;
    thumbnailUri?: string;
    suggestions: string[];
  }>;
}

export function useCaptureFlow({
  defaultGridVariant,
  setDefaultGridVariant,
  timerDuration,
  rawMode,
  suggestions,
  sceneTag,
  setSuggestions,
  setLoading,
  setShowBurstSuggestion,
  burstSuggestionText,
  setLastCapturedScore,
  setLastCapturedScoreReason,
  setLastCapturedUri,
  recognizeSceneTag,
  takePicture,
  runAnalysis,
  savePhotoToGallery,
  computeScoreFromSuggestions,
  requestLocation,
  locationName,
  coords,
  addEntry,
  saveFavorite,
  showToast,
  countdownActive,
  loading,
  burstActive,
  startCountdown,
  capturePreviewFrame,
  lastCapturedBase64Ref,
  lastCapturedUri,
}: UseCaptureFlowOptions): UseCaptureFlowReturn {
  const lastCaptureIdRef = useRef(0);
  const preAnalysisStartedRef = useRef(false);
  const capturedGridVariantRef = useRef<GridVariant>('thirds');
  const capturedSuggestionsRef = useRef<string[]>([]);
  const capturedSceneTagRef = useRef<string>('');
  const capturedLastCapturedUriRef = useRef<string | null>(null);
  const capturedScoreRef = useRef(0);
  const capturedScoreReasonRef = useRef('');
  const capturedTimerDurationRef = useRef(0);

  // Shared metadata snapshot accessible to CameraScreen's shoot-log effect
  const captureMetadataRef = useRef<{
    gridType: string;
    suggestions: string[];
    score?: number;
    scoreReason?: string;
    sceneTag?: string;
    timerDuration?: number;
  }>({
    gridType: GRID_LABELS['thirds'],
    suggestions: [] as string[],
  });

  const doCapture = useCallback(async (skipAnalysis = false) => {
    lastCaptureIdRef.current += 1;

    capturedGridVariantRef.current = defaultGridVariant;
    capturedSuggestionsRef.current = suggestions;
    capturedSceneTagRef.current = sceneTag;
    capturedTimerDurationRef.current = timerDuration;

    captureMetadataRef.current = {
      gridType: GRID_LABELS[defaultGridVariant],
      suggestions,
      sceneTag,
      timerDuration,
    };

    requestLocation();

    const result = await takePicture(rawMode);
    if (!result) { setSuggestions(['错误: 无法获取相机画面']); setLoading(false); return; }
    const { base64, uri: originalUri } = result;
    await savePhotoToGallery(originalUri);
    setLastCapturedUri(originalUri);
    lastCapturedBase64Ref.current = base64;
    capturedLastCapturedUriRef.current = originalUri;

    const { score, reason } = computeScoreFromSuggestions(suggestions);
    capturedScoreRef.current = score;
    capturedScoreReasonRef.current = reason;
    setLastCapturedScore(score);
    setLastCapturedScoreReason(reason);
    captureMetadataRef.current.score = score;
    captureMetadataRef.current.scoreReason = reason;

    if (skipAnalysis) {
      setLoading(false);
      return;
    }

    recognizeSceneTag(base64).then(() => { /* sceneTagVisible handled by caller */ });
    if (!preAnalysisStartedRef.current) {
      await runAnalysis(base64, `画面已叠加${GRID_PROMPT_MAP[defaultGridVariant]}参考线。请根据网格线区域提供构图位置建议。`);
    } else {
      preAnalysisStartedRef.current = false;
    }
    setTimeout(() => {
      if (!burstActive && detectBurstMoment(suggestions)) {
        burstSuggestionText.current = suggestions.find(s => ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => s.includes(k))) || '检测到精彩画面，建议开启连拍捕捉更多瞬间！';
        setShowBurstSuggestion(true);
      }
    }, 100);
  }, [
    defaultGridVariant, suggestions, sceneTag, timerDuration, rawMode, burstActive,
    takePicture, savePhotoToGallery, computeScoreFromSuggestions, requestLocation,
    recognizeSceneTag, runAnalysis, setSuggestions, setLoading, setShowBurstSuggestion,
    burstSuggestionText, setLastCapturedUri, setLastCapturedScore, setLastCapturedScoreReason,
  ]);

  const handleSaveToFavorites = useCallback(async () => {
    if (!lastCapturedUri) return;
    const config = await loadApiConfig();
    let tag = '';
    if (config && lastCapturedBase64Ref.current) {
      showToast('正在识别场景...');
      tag = await recognizeSceneTag(lastCapturedBase64Ref.current);
    }
    const { score, reason } = computeScoreFromSuggestions(suggestions);
    setLastCapturedScore(score);
    setLastCapturedScoreReason(reason);
    await saveFavorite(lastCapturedUri, GRID_LABELS[defaultGridVariant], '', tag || undefined, score, reason);
    showToast('已收藏！');
  }, [lastCapturedUri, lastCapturedBase64Ref, saveFavorite, defaultGridVariant, suggestions, recognizeSceneTag, showToast]);

  const handleGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!uri) { setSuggestions(['错误: 无法读取图片']); return; }
    let base64 = '';
    try {
      try {
        const resized = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.8, format: SaveFormat.JPEG });
        base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
      } catch {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      }
    } catch {
      setSuggestions(['错误: 无法读取图片']); return;
    }
    if (!base64 || base64.length < 1000) { setSuggestions(['错误: 图片数据异常']); return; }
    await runAnalysis(base64);
  }, [runAnalysis, setSuggestions]);

  const handleGridActivate = useCallback((variant: GridVariant) => {
    const order: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
    const nextIndex = (order.indexOf(variant) + 1) % order.length;
    setDefaultGridVariant(order[nextIndex]);
  }, [setDefaultGridVariant]);

  const handleAskAI = useCallback(async () => {
    if (countdownActive || loading || burstActive) return;
    setLoading(true);
    try {
      const preview = await capturePreviewFrame();
      if (preview) {
        preAnalysisStartedRef.current = true;
        runAnalysis(preview.base64, `画面已叠加${GRID_PROMPT_MAP[defaultGridVariant]}参考线。请根据网格线区域提供构图位置建议。`);
      }
    } catch {
      //预分析失败无所谓，正常流程会在 doCapture 里兜底
    }
    startCountdown(timerDuration);
  }, [countdownActive, loading, burstActive, startCountdown, timerDuration, defaultGridVariant, capturePreviewFrame, runAnalysis]);

  const handleQuickCapture = useCallback(() => {
    if (countdownActive || loading || burstActive) return;
    showToast('⚡ 快速拍摄');
    doCapture(true);
  }, [countdownActive, loading, burstActive, showToast, doCapture]);

  return {
    doCapture,
    handleSaveToFavorites,
    handleGallery,
    handleGridActivate,
    handleAskAI,
    handleQuickCapture,
    captureMetadataRef,
  };
}

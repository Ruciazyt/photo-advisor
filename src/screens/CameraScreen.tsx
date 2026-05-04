import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { BubbleOverlay } from '../components/BubbleOverlay';
import { KeypointOverlay } from '../components/KeypointOverlay';
import type { Keypoint, FocusPeakingSensitivity } from '../types';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
import { GridVariant } from '../components/GridOverlay';
import { GridSelectorModal } from '../components/GridSelectorModal';
import { PermissionGate } from '../components/PermissionGate';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { TimerSelectorModal } from '../components/TimerSelectorModal';
import { CompositionScoreOverlay } from '../components/CompositionScoreOverlay';
import { SceneTagOverlay } from '../components/SceneTagOverlay';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useCamera } from '../hooks/useCamera';
import { useCountdown, TimerDuration } from '../hooks/useCountdown';
import { useHistogramToggle } from '../hooks/useHistogramToggle';
import { useFocusPeaking, PeakPoint } from '../hooks/useFocusPeaking';
import { useAnimationFrameTimer } from '../hooks/useAnimationFrameTimer';
import { useFavorites } from '../hooks/useFavorites';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { useSceneRecognition } from '../hooks/useSceneRecognition';
import { useToast } from '../hooks/useToast';
import { useDoubleTap } from '../hooks/useDoubleTap';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { loadAppSettings, saveAppSettings } from '../services/settings';
import { loadApiConfig } from '../services/api';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { CameraTopBar } from '../components/CameraTopBar';
import { CameraControls } from '../components/CameraControls';
import { CameraOverlays } from '../components/CameraOverlays';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { useSuggestions } from '../hooks/useSuggestions';
import { useCaptureOverlay } from '../hooks/useCaptureOverlay';
import { useBurstMode } from '../hooks/useBurstMode';
import { useBubbleChat } from '../hooks/useBubbleChat';
import { useKeypoints } from '../hooks/useKeypoints';
import { useShootLog } from '../hooks/useShootLog';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

function computeScoreFromSuggestions(sugs: string[]): { score: number; reason: string } {
  const positive = ['好', '优秀', '完美', '不错', '佳'];
  const negative = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
  let pos = 0, neg = 0;
  for (const s of sugs) { for (const p of positive) { if (s.includes(p)) pos++; } for (const n of negative) { if (s.includes(n)) neg++; } }
  let score = 50 + Math.min(pos * 20, 40) - Math.min(neg * 15, 45);
  score = Math.max(0, Math.min(100, score));
  const reason = sugs.length > 0 ? sugs[0].replace(/^[^\u4e00-\u9fa5]*/, '').trim().slice(0, 30) : '';
  return { score, reason };
}

export function CameraScreen() {
  const { colors } = useTheme();
  const lastCapturedBase64Ref = useRef<string | null>(null);
  const lastCaptureIdRef = useRef<number>(0);
  const preAnalysisStartedRef = useRef(false);

  // Shoot log — capture metadata at photo time so the useEffect can write after analysis
  const capturedGridVariantRef = useRef<GridVariant>('thirds');
  const capturedSuggestionsRef = useRef<string[]>([]);
  const capturedSceneTagRef = useRef<string>('');
  const capturedLastCapturedUriRef = useRef<string | null>(null);
  const capturedScoreRef = useRef<number>(0);
  const capturedScoreReasonRef = useRef<string>('');
  const capturedTimerDurationRef = useRef<number>(0);

  const { suggestions, setSuggestions, loading, setLoading, handleDismiss, handleDismissAll, bubbleItems } = useSuggestions();

  // useBubbleChat manages staggered reveal of bubble items
  const { visibleItems, setItems: bubbleChatSetItems, setLoading: bubbleChatSetLoading, handleDismiss: bubbleChatDismiss, handleDismissAll: bubbleChatDismissAll } = useBubbleChat({
    onBubbleAppear: (text) => { if (voiceEnabled) checkAndSpeak(text); },
    staggerDelayMs: 250,
  });

  // Keypoints state must be declared before keypointsDismissAllRef
  const { keypoints, showKeypoints, setKeypoints, setShowKeypoints, handleDismiss: keypointsHandleDismiss, handleDismissAll: keypointsHandleDismissAll } = useKeypoints();

  // showBubbleChat and showShakeDetector must be declared before useShakeDetector
  const [showBubbleChat, setShowBubbleChat] = useState(true);
  const [showShakeDetector, setShowShakeDetector] = useState(false);

  // Shake detector — dismiss all AI suggestion overlays on shake
  const bubbleChatDismissAllRef = useRef(bubbleChatDismissAll);
  bubbleChatDismissAllRef.current = bubbleChatDismissAll;
  const handleDismissAllRef = useRef(handleDismissAll);
  handleDismissAllRef.current = handleDismissAll;
  const keypointsDismissAllRef = useRef(keypointsHandleDismissAll);
  keypointsDismissAllRef.current = keypointsHandleDismissAll;

  useShakeDetector({
    onShake: () => {
      bubbleChatDismissAllRef.current();
      handleDismissAllRef.current();
      keypointsDismissAllRef.current();
    },
    enabled: showShakeDetector && showBubbleChat,
  });

  // Sync loading state from useSuggestions to useBubbleChat
  useEffect(() => {
    bubbleChatSetLoading(loading);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed bubbleItems (parsed from suggestions) into useBubbleChat to trigger stagger reveal
  useEffect(() => {
    bubbleChatSetItems(bubbleItems);
  }, [bubbleItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const {
    showComparison, setShowComparison,
    showGridModal, setShowGridModal,
    showTimerModal, setShowTimerModal,
    lastCapturedUri, setLastCapturedUri,
    lastCapturedScore, setLastCapturedScore,
    lastCapturedScoreReason, setLastCapturedScoreReason,
  } = useCaptureOverlay();
  const {
    burstActive, setBurstActive,
    burstCount, setBurstCount,
    showBurstSuggestion, setShowBurstSuggestion,
    burstSuggestionText,
    startBurst,
  } = useBurstMode({ setSuggestions });

  const [apiConfigured, setApiConfigured] = useState(false);
  const [gridVariant, setGridVariant] = useState<GridVariant>('thirds');
  const [showLevel, setShowLevel] = useState(true);
  const [showSunOverlay, setShowSunOverlay] = useState(false);
  const [showFocusGuide, setShowFocusGuide] = useState(false);
  const [showFocusPeaking, setShowFocusPeaking] = useState(false);
  const [focusPeakingColor, setFocusPeakingColor] = useState('#FF4444');
  const [focusPeakingSensitivity, setFocusPeakingSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [peakPoints, setPeakPoints] = useState<PeakPoint[]>([]);
  const [sceneTagVisible, setSceneTagVisible] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [scoreOverlayResult, setScoreOverlayResult] = useState<import('../hooks/useCompositionScore').CompositionScoreResult | null>(null);

  const { opacity: toastOpacity, toastMessage, showToast } = useToast();
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const { checkAndSpeak } = useVoiceFeedback();
  const { saveFavorite } = useFavorites();
  const { addEntry } = useShootLog();
  const { request: requestLocation, locationName, coords } = useCurrentLocation();
  const {
    facing,
    cameraReady,
    rawMode,
    rawSupported,
    selectedMode,
    permission,
    permissionGranted,
    requestPermission,
    setCameraReady,
    switchCamera,
    toggleRawMode,
    setSelectedMode,
    cycleTimerDuration,
    timerDuration,
    setTimerDuration,
    mode,
    cameraRef,
    isRecording,
    startRecording,
    stopRecording,
  } = useCamera({ initialMode: 'photo' });
  const { sceneTag, recognize: recognizeSceneTag } = useSceneRecognition();
  const { width: screenWidth, height: screenHeight } = require('react-native').useWindowDimensions();
  const { showHistogram, histogramData, handleHistogramToggle, handleHistogramPressIn, handleHistogramPressOut } = useHistogramToggle(cameraRef);
  const { capturePeaks } = useFocusPeaking();

  const {
    computeScore, session: challengeSession, challengeMode, toggleChallengeMode, addScore,
  } = useCompositionScore();

  const { takePicture, runAnalysis, savePhotoToGallery, capturePreviewFrame } = useCameraCapture({
    cameraRef, cameraReady, onSuggestionsChange: setSuggestions, onLoadingChange: setLoading,
    onKeypointsChange: setKeypoints, onShowKeypointsChange: setShowKeypoints,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doCapture = useCallback(async (skipAnalysis = false) => {
    lastCaptureIdRef.current += 1;
    const captureId = lastCaptureIdRef.current;
    setShowScoreOverlay(false);

    // Snapshot state into refs for the useEffect that runs after analysis completes
    capturedGridVariantRef.current = gridVariant;
    capturedSuggestionsRef.current = suggestions;
    capturedSceneTagRef.current = sceneTag;
    capturedTimerDurationRef.current = timerDuration;

    // Request location in background — result is read after analysis completes
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

    // Fast capture mode: skip AI analysis
    if (skipAnalysis) {
      setLoading(false);
      return;
    }

    recognizeSceneTag(base64).then(() => { setSceneTagVisible(true); setTimeout(() => setSceneTagVisible(false), 4000); });
    const gridPromptMap: Record<GridVariant, string> = { thirds: '三分法网格', golden: '黄金分割网格', diagonal: '对角线网格', spiral: '螺旋线网格', none: '无网格' };
    if (!preAnalysisStartedRef.current) {
      await runAnalysis(base64, `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`);
    } else {
      preAnalysisStartedRef.current = false;
    }
    setTimeout(() => {
      if (!burstActive && detectBurstMoment(suggestions)) {
        burstSuggestionText.current = suggestions.find(s => ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => s.includes(k))) || '检测到精彩画面，建议开启连拍捕捉更多瞬间！';
        setShowBurstSuggestion(true);
      }
    }, 100);
  }, [takePicture, runAnalysis, savePhotoToGallery, gridVariant, burstActive, suggestions, recognizeSceneTag, rawMode, setSuggestions, setLoading, setShowBurstSuggestion, burstSuggestionText, setLastCapturedScore, setLastCapturedScoreReason]);

  const { active: countdownActive, count: countdownCount, startCountdown, cancelCountdown } = useCountdown({ onComplete: doCapture });

  // Focus peaking — use useAnimationFrameTimer for 60fps-synced capture
  const doCapturePeaks = useCallback(async () => {
    const points = await capturePeaks(cameraRef, screenWidth, screenHeight, focusPeakingSensitivity);
    if (points.length > 0) setPeakPoints(points);
  }, [capturePeaks, cameraRef, screenWidth, screenHeight, focusPeakingSensitivity]);
  useAnimationFrameTimer({ intervalMs: 500, onTick: doCapturePeaks, enabled: showFocusPeaking });
  useEffect(() => { if (!showFocusPeaking) setPeakPoints([]); }, [showFocusPeaking]);

  // Shoot log — add entry when AI analysis finishes (loading: true → false)
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !loading) {
      // Analysis just finished — use the refs captured at doCapture time
      const entry = {
        gridType: GRID_LABELS[capturedGridVariantRef.current] ?? capturedGridVariantRef.current,
        score: capturedScoreRef.current || undefined,
        scoreReason: capturedScoreReasonRef.current || undefined,
        sceneTag: capturedSceneTagRef.current || undefined,
        locationName: locationName ?? undefined,
        latitude: coords?.latitude ?? undefined,
        longitude: coords?.longitude ?? undefined,
        timerDuration: capturedTimerDurationRef.current || undefined,
        wasFavorite: false,
        thumbnailUri: capturedLastCapturedUriRef.current ?? undefined,
        suggestions: capturedSuggestionsRef.current,
      };
      addEntry(entry);
    }
    prevLoadingRef.current = loading;
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Score overlay
  const prevKeypointsRef = useRef<Keypoint[]>([]);
  useEffect(() => {
    if (!showKeypoints || keypoints.length === 0) return;
    if (keypoints === prevKeypointsRef.current) return;
    prevKeypointsRef.current = keypoints;
    const currentCaptureId = lastCaptureIdRef.current;
    const timer = setTimeout(() => {
      if (lastCaptureIdRef.current !== currentCaptureId) return;
      const result = computeScore(keypoints, gridVariant);
      setScoreOverlayResult(result); setShowScoreOverlay(true);
      if (challengeMode) addScore(result.score);
    }, 200);
    return () => clearTimeout(timer);
  }, [keypoints, showKeypoints, computeScore, gridVariant, challengeMode, addScore]);

  const handleSaveToFavorites = useCallback(async () => {
    if (!lastCapturedUri) return;
    const config = await loadApiConfig(); let sceneTag = '';
    if (config && lastCapturedBase64Ref.current) { showToast('正在识别场景...'); sceneTag = await recognizeSceneTag(lastCapturedBase64Ref.current); }
    const { score, reason } = computeScoreFromSuggestions(suggestions);
    setLastCapturedScore(score); setLastCapturedScoreReason(reason);
    await saveFavorite(lastCapturedUri, GRID_LABELS[gridVariant], '', sceneTag || undefined, score, reason);
    showToast('已收藏！');
  }, [lastCapturedUri, saveFavorite, gridVariant, suggestions, recognizeSceneTag, showToast]);

  const handleGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!uri) { setSuggestions(['错误: 无法读取图片']); return; }
    let base64 = '';
    try { try { const resized = await manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.8, format: SaveFormat.JPEG }); base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' }); } catch { base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }); } }
    catch { setSuggestions(['错误: 无法读取图片']); return; }
    if (!base64 || base64.length < 1000) { setSuggestions(['错误: 图片数据异常']); return; }
    await runAnalysis(base64);
  }, [runAnalysis, setSuggestions]);

  const handleDismissWithKeypoints = useCallback((id: number) => {
    handleDismiss(id);
    keypointsHandleDismiss(id);
  }, [handleDismiss, keypointsHandleDismiss]);

  // Cycle grid variant when user taps the grid overlay directly
  const handleGridActivate = useCallback((variant: GridVariant) => {
    const order: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
    const nextIndex = (order.indexOf(variant) + 1) % order.length;
    setGridVariant(order[nextIndex]);
  }, []);

  const loadSettingsOnFocus = useCallback(() => {
    loadAppSettings().then((settings) => {
      setVoiceEnabled(settings.voiceEnabled);
      setTimerDuration(settings.timerDuration);
      setGridVariant(settings.defaultGridVariant);
      setShowLevel(settings.showLevel);
      setShowFocusGuide(settings.showFocusGuide);
      setShowFocusPeaking(settings.showFocusPeaking);
      setFocusPeakingColor(settings.focusPeakingColor ?? '#FF4444');
      setFocusPeakingSensitivity(settings.focusPeakingSensitivity ?? 'medium');
      setShowSunOverlay(settings.showSunPosition);
      setShowBubbleChat(settings.showBubbleChat ?? true);
      setShowShakeDetector(settings.showShakeDetector ?? false);
      setShowKeypoints(settings.showKeypoints ?? false);
    });
    import('../services/api').then(({ loadApiConfig }) => loadApiConfig().then((config) => setApiConfigured(!!config)));
  }, []);

  useFocusEffect(loadSettingsOnFocus);

  // Track recording duration while isRecording is true
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleAskAI = useCallback(async () => {
    if (countdownActive || loading || burstActive) return;
    setLoading(true);

    const gridPromptMap: Record<GridVariant, string> = {
      thirds: "三分法网格", golden: "黄金分割网格",
      diagonal: "对角线网格", spiral: "螺旋线网格", none: "无网格",
    };
    const previewPrompt = `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`;

    try {
      const preview = await capturePreviewFrame();
      if (preview) {
        preAnalysisStartedRef.current = true;
        runAnalysis(preview.base64, previewPrompt);
      }
    } catch {
      // 预分析失败无所谓，正常流程会在 doCapture 里兜底
    }

    startCountdown(timerDuration);
  }, [countdownActive, loading, burstActive, startCountdown, timerDuration, gridVariant, capturePreviewFrame, runAnalysis]);

  const handleQuickCapture = useCallback(() => {
    if (countdownActive || loading || burstActive) return;
    showToast('⚡ 快速拍摄');
    doCapture(true);
  }, [countdownActive, loading, burstActive, showToast]);

  if (!permission) return <View style={[staticStyles.container, { backgroundColor: colors.primary }]}><ActivityIndicator color={colors.accent} size="large" /></View>;
  if (!permission.granted) return <PermissionGate title="需要相机权限" icon="camera-outline" message="拍摄参谋需要访问您的相机来拍摄照片" buttonText="授权相机" onRequest={requestPermission} />;

  return (
    <View style={[staticStyles.container, { backgroundColor: colors.primary }]}>
      <CameraView ref={cameraRef} style={staticStyles.camera} facing={facing} mode={mode} onCameraReady={() => setCameraReady(true)}>
        <CameraOverlays
          apiConfigured={apiConfigured} showPortraitMode={selectedMode === 'portrait'} gridVariant={gridVariant} showGridModal={showGridModal}
          onGridSelect={setGridVariant} onGridModalClose={() => setShowGridModal(false)}
          onGridActivate={handleGridActivate}
          showLevel={showLevel} showHistogram={showHistogram} histogramData={histogramData}
          showFocusGuide={showFocusGuide} showFocusPeaking={showFocusPeaking} cameraRef={cameraRef} peakPoints={peakPoints}
          screenWidth={screenWidth} screenHeight={screenHeight} showSunOverlay={showSunOverlay}
          showToast={showToast}
          showBurstSuggestion={showBurstSuggestion} burstSuggestionText={burstSuggestionText.current}
          onBurstSuggestionAccept={() => { setShowBurstSuggestion(false); startBurst(doCapture); }}
          onBurstSuggestionDismiss={() => setShowBurstSuggestion(false)} burstActive={burstActive}
          showKeypoints={showKeypoints} keypoints={keypoints} showScoreOverlay={showScoreOverlay}
          scoreOverlayResult={scoreOverlayResult} challengeMode={challengeMode}
          challengeSession={challengeSession} onScoreDismiss={() => setShowScoreOverlay(false)}
          sceneTag={sceneTag} sceneTagVisible={sceneTagVisible} countdownActive={countdownActive}
          countdownCount={countdownCount} onCountdownComplete={doCapture}
          lastCapturedUri={lastCapturedUri} bubbleItems={bubbleItems} showComparison={showComparison}
          lastCapturedScore={lastCapturedScore} lastCapturedScoreReason={lastCapturedScoreReason}
          onComparisonClose={() => setShowComparison(false)}
          focusPeakingColor={focusPeakingColor}
        />
        <CameraTopBar
          gridVariant={gridVariant} showGridModal={showGridModal} onGridPress={() => setShowGridModal(true)}
          onGridSelect={setGridVariant} onGridModalClose={() => setShowGridModal(false)}
          showHistogram={showHistogram} onHistogramToggle={handleHistogramToggle}
          onHistogramPressIn={handleHistogramPressIn} onHistogramPressOut={handleHistogramPressOut}
          showLevel={showLevel} onLevelToggle={() => setShowLevel(v => !v)}
          showSunOverlay={showSunOverlay} onSunToggle={() => setShowSunOverlay(v => !v)}
          showFocusGuide={showFocusGuide} onFocusGuideToggle={() => setShowFocusGuide(v => !v)}
          showFocusPeaking={showFocusPeaking} onFocusPeakingToggle={() => setShowFocusPeaking(v => !v)}
          voiceEnabled={voiceEnabled} onVoiceToggle={() => setVoiceEnabled(v => !v)}
          rawMode={rawMode} rawSupported={rawSupported} onRawToggle={toggleRawMode}
          challengeMode={challengeMode} onChallengeToggle={toggleChallengeMode}
          timerDuration={timerDuration} countdownActive={countdownActive}
          onTimerPress={() => setShowTimerModal(true)} onCancelCountdown={cancelCountdown}
          lastCapturedUri={lastCapturedUri} onSaveToFavorites={handleSaveToFavorites}
          suggestions={suggestions} lastCapturedScore={lastCapturedScore}
          lastCapturedScoreReason={lastCapturedScoreReason}
          showKeypoints={showKeypoints} onComparePress={() => setShowComparison(true)} onKeypointsToggle={async () => { const next = !showKeypoints; setShowKeypoints(next); await saveAppSettings({ showKeypoints: next }); }}
          burstActive={burstActive} burstCount={burstCount}
          toastOpacity={toastOpacity} toastMessage={toastMessage}
          showShakeDetector={showShakeDetector} onShakeDetectorToggle={async () => { const next = !showShakeDetector; setShowShakeDetector(next); await saveAppSettings({ showShakeDetector: next }); }}
        />
        <CameraControls
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          onGallery={handleGallery}
          onAskAI={handleAskAI}
          onSwitchCamera={switchCamera}
          onQuickCapture={handleQuickCapture}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
        <RecordingIndicator isRecording={isRecording} durationSeconds={recordingDuration} />
      </CameraView>
      <BubbleOverlay hidden={!showBubbleChat} visibleItems={visibleItems} loading={loading} onDismiss={(id) => { bubbleChatDismiss(id); handleDismissWithKeypoints(id); }} onDismissAll={() => { bubbleChatDismissAll(); handleDismissAll(); keypointsHandleDismissAll(); }} />
      <TimerSelectorModal
        visible={showTimerModal}
        selectedDuration={timerDuration}
        onSelect={async (dur) => {
          const d = dur as TimerDuration;
          setTimerDuration(d);
          await saveAppSettings({ timerDuration: d });
          setShowTimerModal(false);
        }}
        onClose={() => setShowTimerModal(false)}
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, width: '100%' },
});

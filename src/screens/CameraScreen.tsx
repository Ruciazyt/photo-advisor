import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { BubbleOverlay } from '../components/BubbleOverlay';
import { KeypointOverlay } from '../components/KeypointOverlay';
import type { Keypoint, FocusPeakingSensitivity, GridVariant } from '../types';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
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
import { speak, useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { useSceneRecognition } from '../hooks/useSceneRecognition';
import { useToast } from '../hooks/useToast';
import { useDoubleTap } from '../hooks/useDoubleTap';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { usePinchToZoom } from '../hooks/usePinchToZoom';

import { loadApiConfig } from '../services/api';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { CameraTopBar } from '../components/CameraTopBar';
import { CameraControls } from '../components/CameraControls';
import { CameraOverlays } from '../components/CameraOverlays';
import { RecordingIndicator } from '../components/RecordingIndicator';
import { PinchHintOverlay } from '../components/PinchHintOverlay';
import { ExposureBar } from '../components/ExposureBar';
import { useSuggestions } from '../hooks/useSuggestions';
import { useCaptureOverlay } from '../hooks/useCaptureOverlay';
import { useBurstMode } from '../hooks/useBurstMode';
import { useExposure } from '../hooks/useExposure';
import { useBubbleChat } from '../hooks/useBubbleChat';
import { useKeypoints } from '../hooks/useKeypoints';
import { useShootLog } from '../hooks/useShootLog';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { computeScoreFromSuggestions } from '../utils/parsing';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

export function CameraScreen() {
  const { colors } = useTheme();
  const {
    voiceEnabled, setVoiceEnabled,
    defaultGridVariant, setDefaultGridVariant,
    showHistogram,
    showLevel, setShowLevel,
    showFocusPeaking, setShowFocusPeaking,
    showSunPosition,
    showFocusGuide, setShowFocusGuide,
    showEV, setShowEV,
    showPinchToZoom, setShowPinchToZoom,
    focusPeakingColor, setFocusPeakingColor,
    focusPeakingSensitivity, setFocusPeakingSensitivity,
    showRawMode, setShowRawMode,
    showBubbleChat, setShowBubbleChat,
    showShakeDetector, setShowShakeDetector,
    showKeypoints, setShowKeypoints,
    timerDuration, setTimerDuration,
    imageQualityPreset,
  } = useSettings();
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
  const { keypoints, setKeypoints, handleDismiss: keypointsHandleDismiss, handleDismissAll: keypointsHandleDismissAll } = useKeypoints();

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
    onShakeVoiceFeedback: showShakeDetector ? () => speak('已关闭所有建议') : undefined,
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
  const [peakPoints, setPeakPoints] = useState<PeakPoint[]>([]);
  const [sceneTagVisible, setSceneTagVisible] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [scoreOverlayResult, setScoreOverlayResult] = useState<import('../hooks/useCompositionScore').CompositionScoreResult | null>(null);

  const { opacity: toastOpacity, toastMessage, showToast } = useToast();

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
  } = useCamera({
    initialMode: 'photo',
    onSettingChange: (key, value) => {
      if (key === 'showRawMode') setShowRawMode(value);
    },
  });
  const { exposureComp, minEC, maxEC, setExposureCompensation, isAdjusting } = useExposure(cameraRef);
  const { onPinchGesture, hasUsedPinch, dismissHint } = usePinchToZoom({ cameraRef, enabled: showPinchToZoom });
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
    capturedGridVariantRef.current = defaultGridVariant;
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
      await runAnalysis(base64, `画面已叠加${gridPromptMap[defaultGridVariant]}参考线。请根据网格线区域提供构图位置建议。`);
    } else {
      preAnalysisStartedRef.current = false;
    }
    setTimeout(() => {
      if (!burstActive && detectBurstMoment(suggestions)) {
        burstSuggestionText.current = suggestions.find(s => ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => s.includes(k))) || '检测到精彩画面，建议开启连拍捕捉更多瞬间！';
        setShowBurstSuggestion(true);
      }
    }, 100);
  }, [takePicture, runAnalysis, savePhotoToGallery, defaultGridVariant, burstActive, suggestions, recognizeSceneTag, rawMode, setSuggestions, setLoading, setShowBurstSuggestion, burstSuggestionText, setLastCapturedScore, setLastCapturedScoreReason]);

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
      const result = computeScore(keypoints, defaultGridVariant);
      setScoreOverlayResult(result); setShowScoreOverlay(true);
      if (challengeMode) addScore(result.score);
    }, 200);
    return () => clearTimeout(timer);
  }, [keypoints, showKeypoints, computeScore, defaultGridVariant, challengeMode, addScore]);

  const handleSaveToFavorites = useCallback(async () => {
    if (!lastCapturedUri) return;
    const config = await loadApiConfig(); let sceneTag = '';
    if (config && lastCapturedBase64Ref.current) { showToast('正在识别场景...'); sceneTag = await recognizeSceneTag(lastCapturedBase64Ref.current); }
    const { score, reason } = computeScoreFromSuggestions(suggestions);
    setLastCapturedScore(score); setLastCapturedScoreReason(reason);
    await saveFavorite(lastCapturedUri, GRID_LABELS[defaultGridVariant], '', sceneTag || undefined, score, reason);
    showToast('已收藏！');
  }, [lastCapturedUri, saveFavorite, defaultGridVariant, suggestions, recognizeSceneTag, showToast]);

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
    const nextVariant = order[nextIndex];
    setDefaultGridVariant(nextVariant);
  }, []);

  const handleGridSelect = useCallback(async (variant: GridVariant) => {
    setDefaultGridVariant(variant);
  }, []);

  // Load API config on mount
  useEffect(() => {
    import('../services/api').then(({ loadApiConfig }) => loadApiConfig().then((config) => setApiConfigured(!!config)));
  }, []);

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
    const previewPrompt = `画面已叠加${gridPromptMap[defaultGridVariant]}参考线。请根据网格线区域提供构图位置建议。`;

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
  }, [countdownActive, loading, burstActive, startCountdown, timerDuration, defaultGridVariant, capturePreviewFrame, runAnalysis]);

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
          apiConfigured={apiConfigured} showPortraitMode={selectedMode === 'portrait'} gridVariant={defaultGridVariant} showGridModal={showGridModal}
          onGridSelect={handleGridSelect} onGridModalClose={() => setShowGridModal(false)}
          onGridActivate={handleGridActivate}
          showLevel={showLevel} showHistogram={showHistogram} histogramData={histogramData}
          showFocusGuide={showFocusGuide} showFocusPeaking={showFocusPeaking} cameraRef={cameraRef} peakPoints={peakPoints}
          screenWidth={screenWidth} screenHeight={screenHeight} showSunOverlay={showSunPosition}
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
        <PinchHintOverlay visible={showPinchToZoom && !hasUsedPinch} onDismiss={dismissHint} />
        <CameraTopBar
          gridVariant={defaultGridVariant} showGridModal={showGridModal} onGridPress={() => setShowGridModal(true)}
          onGridSelect={handleGridSelect} onGridModalClose={() => setShowGridModal(false)}
          showHistogram={showHistogram} onHistogramToggle={handleHistogramToggle}
          onHistogramPressIn={handleHistogramPressIn} onHistogramPressOut={handleHistogramPressOut}
          showLevel={showLevel} onLevelToggle={() => setShowLevel(v => !v)}
          showSunOverlay={showSunPosition} onSunToggle={() => setShowSunPosition(!showSunPosition)}
          showFocusGuide={showFocusGuide} onFocusGuideToggle={() => setShowFocusGuide(v => !v)}
          showFocusPeaking={showFocusPeaking} onFocusPeakingToggle={() => setShowFocusPeaking(!showFocusPeaking)}
          voiceEnabled={voiceEnabled} onVoiceToggle={() => setVoiceEnabled(v => !v)}
          rawMode={rawMode} rawSupported={rawSupported} onRawToggle={toggleRawMode}
          challengeMode={challengeMode} onChallengeToggle={toggleChallengeMode}
          timerDuration={timerDuration} countdownActive={countdownActive}
          onTimerPress={() => setShowTimerModal(true)} onCancelCountdown={cancelCountdown}
          lastCapturedUri={lastCapturedUri} onSaveToFavorites={handleSaveToFavorites}
          suggestions={suggestions} lastCapturedScore={lastCapturedScore}
          lastCapturedScoreReason={lastCapturedScoreReason}
          showKeypoints={showKeypoints} onComparePress={() => setShowComparison(true)} onKeypointsToggle={() => setShowKeypoints(!showKeypoints)}
          burstActive={burstActive} burstCount={burstCount}
          toastOpacity={toastOpacity} toastMessage={toastMessage}
          showShakeDetector={showShakeDetector} onShakeDetectorToggle={() => setShowShakeDetector(!showShakeDetector)}
          showEV={showEV} onEVToggle={() => setShowEV(v => !v)} currentEV={exposureComp}
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
        onSelect={(dur) => {
          const d = dur as TimerDuration;
          setTimerDuration(d);
          setShowTimerModal(false);
        }}
        onClose={() => setShowTimerModal(false)}
      />
      <ExposureBar
        visible={showEV}
        exposureComp={exposureComp}
        minEC={minEC}
        maxEC={maxEC}
        onExposureChange={(v) => setExposureCompensation(v)}
        onExposureChangeEnd={(v) => setExposureCompensation(v)}
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, width: '100%' },
});

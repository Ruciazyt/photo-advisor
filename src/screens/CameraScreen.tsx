import React, { useState, useRef, useCallback, useEffect } from 'react';

import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { BubbleOverlay } from '../components/BubbleOverlay';
import type { Keypoint, PeakPoint, GridVariant } from '../types';
import { PermissionGate } from '../components/PermissionGate';
import { TimerSelectorModal } from '../components/TimerSelectorModal';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useCamera } from '../hooks/useCamera';
import { useCountdown, TimerDuration } from '../hooks/useCountdown';
import { useHistogramToggle } from '../hooks/useHistogramToggle';
import { useFocusPeaking } from '../hooks/useFocusPeaking';
import { useAnimationFrameTimer } from '../hooks/useAnimationFrameTimer';
import { speak, useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { useToast } from '../hooks/useToast';
import { useShakeDetector } from '../hooks/useShakeDetector';
import { usePinchToZoom } from '../hooks/usePinchToZoom';

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
import { useCaptureFlow } from '../hooks/useCaptureFlow';
import { useFavorites } from '../hooks/useFavorites';
import { useShootLog } from '../hooks/useShootLog';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useSceneRecognition } from '../hooks/useSceneRecognition';
import { computeScoreFromSuggestions } from '../utils/parsing';

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

export function CameraScreen() {
  const { colors } = useTheme();
  const {
    voiceEnabled, setVoiceEnabled,
    defaultGridVariant, setDefaultGridVariant,
    showLevel, setShowLevel,
    showFocusPeaking, setShowFocusPeaking,
    showSunPosition, setShowSunPosition,
    showFocusGuide, setShowFocusGuide,
    showEV, setShowEV,
    showPinchToZoom, setShowPinchToZoom,
    focusPeakingColor,
    focusPeakingSensitivity,
    showRawMode, setShowRawMode,
    showBubbleChat, setShowBubbleChat,
    showShakeDetector, setShowShakeDetector,
    showKeypoints, setShowKeypoints,
    timerDuration, setTimerDuration,
  } = useSettings();

  // Base64 of last captured photo — needed by handleSaveToFavorites
  const lastCapturedBase64Ref = useRef<string | null>(null);

  const { suggestions, setSuggestions, loading, setLoading, handleDismiss, handleDismissAll, bubbleItems } = useSuggestions();

  // useBubbleChat manages staggered reveal of bubble items
  const { visibleItems, setItems: bubbleChatSetItems, setLoading: bubbleChatSetLoading, handleDismiss: bubbleChatDismiss, handleDismissAll: bubbleChatDismissAll } = useBubbleChat({
    onBubbleAppear: (text) => { if (voiceEnabled) checkAndSpeak(text); },
    staggerDelayMs: 250,
  });

  const { keypoints, setKeypoints, handleDismiss: keypointsHandleDismiss, handleDismissAll: keypointsHandleDismissAll } = useKeypoints();

  // Dismiss-all refs for shake detector
  const bubbleChatDismissAllRef = useRef(bubbleChatDismissAll);
  bubbleChatDismissAllRef.current = bubbleChatDismissAll;
  const handleDismissAllRef = useRef(handleDismissAll);
  handleDismissAllRef.current = handleDismissAll;
  const keypointsDismissAllRef = useRef(keypointsHandleDismissAll);
  keypointsDismissAllRef.current = keypointsHandleDismissAll;

  const onShake = useCallback((intensity?: number) => {
    bubbleChatDismissAllRef.current();
    handleDismissAllRef.current();
    keypointsDismissAllRef.current();
    if (showShakeDetector) {
      if (intensity != null && intensity > 0.7) {
        speak('用力摇晃，所有建议已关闭');
      } else {
        speak('轻摇一下，建议已关闭');
      }
    }
  }, []);

  useShakeDetector({
    onShake,
    enabled: showShakeDetector && showBubbleChat,
  });

  useEffect(() => { bubbleChatSetLoading(loading); }, [loading]);
  useEffect(() => { bubbleChatSetItems(bubbleItems); }, [bubbleItems]);

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
    facing, cameraReady, rawMode, rawSupported, selectedMode,
    permission, permissionGranted, requestPermission,
    setCameraReady, switchCamera, toggleRawMode, setSelectedMode,
    mode, cameraRef,
    isRecording, startRecording, stopRecording,
  } = useCamera({
    initialMode: 'photo',
    onSettingChange: (key, value) => { if (key === 'showRawMode') setShowRawMode(value); },
  });
  const { exposureComp, minEC, maxEC, setExposureCompensation } = useExposure(cameraRef);
  const { onPinchGesture, hasUsedPinch, dismissHint } = usePinchToZoom({ cameraRef, enabled: showPinchToZoom });
  const { sceneTag, recognize: recognizeSceneTag } = useSceneRecognition();
  const { width: screenWidth, height: screenHeight } = require('react-native').useWindowDimensions();
  const { showHistogram, histogramData, handleHistogramToggle, handleHistogramPressIn, handleHistogramPressOut } = useHistogramToggle(cameraRef);
  const { capturePeaks } = useFocusPeaking();
  const { computeScore, session: challengeSession, challengeMode, toggleChallengeMode, addScore } = useCompositionScore();

  const { takePicture, runAnalysis, savePhotoToGallery, capturePreviewFrame } = useCameraCapture({
    cameraRef, cameraReady, onSuggestionsChange: setSuggestions, onLoadingChange: setLoading,
    onKeypointsChange: setKeypoints, onShowKeypointsChange: setShowKeypoints,
  });

  const { active: countdownActive, count: countdownCount, startCountdown, cancelCountdown } = useCountdown({
    onComplete: async () => {
      setShowScoreOverlay(false);
      lastCaptureIdRef.current += 1;
      const captureId = lastCaptureIdRef.current;

      capturedGridVariantRef.current = defaultGridVariant;
      capturedSuggestionsRef.current = suggestions;
      capturedSceneTagRef.current = sceneTag;
      capturedTimerDurationRef.current = timerDuration;
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
    },
  });

  // Internal refs for the countdown onComplete callback above
  const lastCaptureIdRef = useRef(0);
  const preAnalysisStartedRef = useRef(false);
  const capturedGridVariantRef = useRef<GridVariant>('thirds');
  const capturedSuggestionsRef = useRef<string[]>([]);
  const capturedSceneTagRef = useRef<string>('');
  const capturedLastCapturedUriRef = useRef<string | null>(null);
  const capturedScoreRef = useRef(0);
  const capturedScoreReasonRef = useRef('');
  const capturedTimerDurationRef = useRef(0);

  // Import detectBurstMoment inline to avoid module-level import cycle
  const detectBurstMoment = (ss: string[]) => {
    return ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => ss.some(s => s.includes(k)));
  };

  // Focus peaking
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
  }, [loading, locationName, coords, addEntry]);

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

  // Capture flow hook
  const { doCapture, handleSaveToFavorites, handleGallery, handleGridActivate, handleAskAI, handleQuickCapture } = useCaptureFlow({
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
  });

  const handleDismissWithKeypoints = useCallback((id: number) => {
    handleDismiss(id);
    keypointsHandleDismiss(id);
  }, [handleDismiss, keypointsHandleDismiss]);

  const handleGridSelect = useCallback((variant: GridVariant) => {
    setDefaultGridVariant(variant);
  }, [setDefaultGridVariant]);

  // Load API config on mount
  useEffect(() => {
    import('../services/api').then(({ loadApiConfig }) => loadApiConfig().then((config) => setApiConfigured(!!config)));
  }, []);

  // Track recording duration
  useEffect(() => {
    if (!isRecording) { setRecordingDuration(0); return; }
    const interval = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

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
          showLevel={showLevel} onLevelToggle={() => setShowLevel(!showLevel)}
          showSunOverlay={showSunPosition} onSunToggle={() => setShowSunPosition(!showSunPosition)}
          showFocusGuide={showFocusGuide} onFocusGuideToggle={() => setShowFocusGuide(!showFocusGuide)}
          showFocusPeaking={showFocusPeaking} onFocusPeakingToggle={() => setShowFocusPeaking(!showFocusPeaking)}
          voiceEnabled={voiceEnabled} onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
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
          showEV={showEV} onEVToggle={() => setShowEV(!showEV)} currentEV={exposureComp}
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

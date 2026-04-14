import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../contexts/ThemeContext';
import { BubbleOverlay, BubbleItem } from '../components/BubbleOverlay';
import { KeypointOverlay, Keypoint } from '../components/KeypointOverlay';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
import { GridVariant } from '../components/GridOverlay';
import { GridSelectorModal } from '../components/GridSelectorModal';
import { PermissionGate } from '../components/PermissionGate';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { CompositionScoreOverlay } from '../components/CompositionScoreOverlay';
import { SceneTagOverlay } from '../components/SceneTagOverlay';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useCountdown, TimerDuration } from '../hooks/useCountdown';
import { useHistogramToggle } from '../hooks/useHistogramToggle';
import { useFocusPeaking, PeakPoint } from '../hooks/useFocusPeaking';
import { useFavorites } from '../hooks/useFavorites';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { useSceneRecognition } from '../hooks/useSceneRecognition';
import { loadAppSettings } from '../services/settings';
import { loadApiConfig } from '../services/api';
import { detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { CameraTopBar } from '../components/CameraTopBar';
import { CameraControls } from '../components/CameraControls';
import { CameraOverlays } from '../components/CameraOverlays';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

const TIMER_DURATIONS: TimerDuration[] = [3, 5, 10];
const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

function textToBubbleItem(text: string, index: number): BubbleItem {
  const posMap: Record<string, BubbleItem['position']> = {
    '[左上]': 'top-left', '[右上]': 'top-right', '[左下]': 'bottom-left', '[右下]': 'bottom-right', '[中间]': 'center',
  };
  const roundRobin: BubbleItem['position'][] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  let position: BubbleItem['position'] = roundRobin[index % roundRobin.length];
  for (const [tag, pos] of Object.entries(posMap)) { if (text.includes(tag)) { position = pos; break; } }
  return { id: index, text, position };
}

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
  const cameraRef = useRef<CameraView>(null);
  const peakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCapturedBase64Ref = useRef<string | null>(null);
  const lastCaptureIdRef = useRef<number>(0);
  const preAnalysisStartedRef = useRef(false);
  const burstSuggestionText = useRef('');

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CameraMode>('photo');
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [gridVariant, setGridVariant] = useState<GridVariant>('thirds');
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(3);
  const [showLevel, setShowLevel] = useState(true);
  const [showSunOverlay, setShowSunOverlay] = useState(false);
  const [showFocusGuide, setShowFocusGuide] = useState(false);
  const [peakPoints, setPeakPoints] = useState<PeakPoint[]>([]);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [lastCapturedScore, setLastCapturedScore] = useState<number | null>(null);
  const [lastCapturedScoreReason, setLastCapturedScoreReason] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));
  const [toastMessage, setToastMessage] = useState('已收藏！');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [rawSupported, setRawSupported] = useState(false);
  const [burstActive, setBurstActive] = useState(false);
  const [burstCount, setBurstCount] = useState(0);
  const [showBurstSuggestion, setShowBurstSuggestion] = useState(false);
  const [sceneTagVisible, setSceneTagVisible] = useState(false);
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [scoreOverlayResult, setScoreOverlayResult] = useState<import('../hooks/useCompositionScore').CompositionScoreResult | null>(null);

  const { checkAndSpeak } = useVoiceFeedback();
  const { saveFavorite } = useFavorites();
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
  const doCapture = useCallback(async () => {
    lastCaptureIdRef.current += 1;
    const captureId = lastCaptureIdRef.current;
    setShowScoreOverlay(false);
    const result = await takePicture(rawMode);
    if (!result) { setSuggestions(['错误: 无法获取相机画面']); setLoading(false); return; }
    const { base64, uri: originalUri } = result;
    await savePhotoToGallery(originalUri);
    setLastCapturedUri(originalUri);
    lastCapturedBase64Ref.current = base64;
    recognizeSceneTag(base64).then(() => { setSceneTagVisible(true); setTimeout(() => setSceneTagVisible(false), 4000); });
    const gridPromptMap: Record<GridVariant, string> = { thirds: '三分法网格', golden: '黄金分割网格', diagonal: '对角线网格', spiral: '螺旋线网格', none: '无网格' };
    if (!preAnalysisStartedRef.current) {
      await runAnalysis(base64, `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`);
    } else {
      // 预分析已在倒计时期间启动，跳过重复调用
      preAnalysisStartedRef.current = false;
    }
    setTimeout(() => {
      if (!burstActive && detectBurstMoment(suggestions)) {
        burstSuggestionText.current = suggestions.find(s => ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => s.includes(k))) || '检测到精彩画面，建议开启连拍捕捉更多瞬间！';
        setShowBurstSuggestion(true);
      }
    }, 100);
  }, [takePicture, runAnalysis, savePhotoToGallery, gridVariant, burstActive, suggestions, recognizeSceneTag, rawMode]);

  const { active: countdownActive, count: countdownCount, startCountdown, cancelCountdown } = useCountdown({ onComplete: doCapture });

  const startBurst = useCallback(() => {
    if (burstActive) return;
    setBurstActive(true); setBurstCount(0); let shot = 0;
    const burstInterval = setInterval(() => { doCapture(); shot++; setBurstCount(shot); if (shot >= 5) { clearInterval(burstInterval); setBurstActive(false); setSuggestions(prev => [...prev, `连拍完成：共${shot}张`]); } }, 700);
  }, [burstActive, doCapture]);

  const cycleTimerDuration = useCallback(() => {
    const nextIdx = (TIMER_DURATIONS.indexOf(timerDuration) + 1) % TIMER_DURATIONS.length;
    setTimerDuration(TIMER_DURATIONS[nextIdx]);
  }, [timerDuration]);

  // Focus Peaking interval
  useEffect(() => {
    if (!showFocusGuide) { if (peakingTimerRef.current) { clearInterval(peakingTimerRef.current); peakingTimerRef.current = null; } setPeakPoints([]); return; }
    const doCapture = async () => { const points = await capturePeaks(cameraRef, screenWidth, screenHeight); if (points.length > 0) setPeakPoints(points); };
    doCapture();
    peakingTimerRef.current = setInterval(doCapture, 500);
    return () => { if (peakingTimerRef.current) clearInterval(peakingTimerRef.current); };
  }, [showFocusGuide, capturePeaks, cameraRef, screenWidth, screenHeight]);

  useEffect(() => {
    return () => { if (peakingTimerRef.current) clearInterval(peakingTimerRef.current); };
  }, []);

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

  const handleRawToggle = useCallback(() => {
    if (!rawSupported && !rawMode) { showToast('RAW仅支持Android设备'); return; }
    setRawMode(v => !v);
  }, [rawSupported, rawMode]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }), Animated.delay(1200), Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true })]).start();
  }, [toastOpacity]);

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
  }, [runAnalysis]);

  const handleDismiss = useCallback((id: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== id));
    setKeypoints(prev => { const next = prev.filter(kp => kp.id !== id); if (next.length === 0) setShowKeypoints(false); return next; });
  }, []);

  const handleDismissAll = useCallback(() => { setSuggestions([]); setKeypoints([]); setShowKeypoints(false); }, []);

  useEffect(() => {
    loadAppSettings().then((settings) => setVoiceEnabled(settings.voiceEnabled));
    import('../hooks/useCameraCapture').then(({ supportsRawCapture }) => supportsRawCapture().then(setRawSupported));
    import('../services/api').then(({ loadApiConfig }) => loadApiConfig().then((config) => setApiConfigured(!!config)));
  }, []);

  const handleAskAI = useCallback(async () => {
    if (countdownActive || loading || burstActive) return;
    setLoading(true);

    // 在倒计时期间预先开始分析
    const gridPromptMap: Record<GridVariant, string> = {
      thirds: "三分法网格", golden: "黄金分割网格",
      diagonal: "对角线网格", spiral: "螺旋线网格", none: "无网格",
    };
    const previewPrompt = `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`;

    try {
      const preview = await capturePreviewFrame();
      if (preview) {
        preAnalysisStartedRef.current = true;
        // 不 await，让它在后台运行
        runAnalysis(preview.base64, previewPrompt);
      }
    } catch {
      // 预分析失败无所谓，正常流程会在 doCapture 里兜底
    }

    startCountdown(timerDuration);
  }, [countdownActive, loading, burstActive, startCountdown, timerDuration, gridVariant, capturePreviewFrame, runAnalysis]);

  const handleSwitchCamera = useCallback(() => setFacing((f: CameraType) => f === 'back' ? 'front' : 'back'), []);

  const bubbleItems: BubbleItem[] = suggestions.map((text, i) => textToBubbleItem(text, i));

  if (!permission) return <View style={styles.container}><ActivityIndicator color={colors.accent} size="large" /></View>;
  if (!permission.granted) return <PermissionGate title="需要相机权限" icon="camera-outline" message="拍摄参谋需要访问您的相机来拍摄照片" buttonText="授权相机" onRequest={requestPermission} />;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} onCameraReady={() => setCameraReady(true)}>
        <CameraOverlays
          apiConfigured={apiConfigured} gridVariant={gridVariant} showGridModal={showGridModal}
          onGridSelect={setGridVariant} onGridModalClose={() => setShowGridModal(false)}
          showLevel={showLevel} showHistogram={showHistogram} histogramData={histogramData}
          showFocusGuide={showFocusGuide} cameraRef={cameraRef} peakPoints={peakPoints}
          screenWidth={screenWidth} screenHeight={screenHeight} showSunOverlay={showSunOverlay}
          showBurstSuggestion={showBurstSuggestion} burstSuggestionText={burstSuggestionText.current}
          onBurstSuggestionAccept={() => { setShowBurstSuggestion(false); startBurst(); }}
          onBurstSuggestionDismiss={() => setShowBurstSuggestion(false)} burstActive={burstActive}
          showKeypoints={showKeypoints} keypoints={keypoints} showScoreOverlay={showScoreOverlay}
          scoreOverlayResult={scoreOverlayResult} challengeMode={challengeMode}
          challengeSession={challengeSession} onScoreDismiss={() => setShowScoreOverlay(false)}
          sceneTag={sceneTag} sceneTagVisible={sceneTagVisible} countdownActive={countdownActive}
          countdownCount={countdownCount} onCountdownComplete={doCapture}
          lastCapturedUri={lastCapturedUri} bubbleItems={bubbleItems} showComparison={showComparison}
          lastCapturedScore={lastCapturedScore} lastCapturedScoreReason={lastCapturedScoreReason}
          onComparisonClose={() => setShowComparison(false)}
        />
        <CameraTopBar
          gridVariant={gridVariant} showGridModal={showGridModal} onGridPress={() => setShowGridModal(true)}
          onGridSelect={setGridVariant} onGridModalClose={() => setShowGridModal(false)}
          showHistogram={showHistogram} onHistogramToggle={handleHistogramToggle}
          onHistogramPressIn={handleHistogramPressIn} onHistogramPressOut={handleHistogramPressOut}
          showLevel={showLevel} onLevelToggle={() => setShowLevel(v => !v)}
          showSunOverlay={showSunOverlay} onSunToggle={() => setShowSunOverlay(v => !v)}
          showFocusGuide={showFocusGuide} onFocusGuideToggle={() => setShowFocusGuide(v => !v)}
          voiceEnabled={voiceEnabled} onVoiceToggle={() => setVoiceEnabled(v => !v)}
          rawMode={rawMode} rawSupported={rawSupported} onRawToggle={handleRawToggle}
          challengeMode={challengeMode} onChallengeToggle={toggleChallengeMode}
          timerDuration={timerDuration} countdownActive={countdownActive}
          onTimerPress={cycleTimerDuration} onCancelCountdown={cancelCountdown}
          lastCapturedUri={lastCapturedUri} onSaveToFavorites={handleSaveToFavorites}
          suggestions={suggestions} lastCapturedScore={lastCapturedScore}
          showKeypoints={showKeypoints} onComparePress={() => setShowComparison(true)}
          burstActive={burstActive} burstCount={burstCount}
          toastOpacity={toastOpacity} toastMessage={toastMessage}
        />
        <CameraControls selectedMode={selectedMode} onModeChange={setSelectedMode} onGallery={handleGallery} onAskAI={handleAskAI} onSwitchCamera={handleSwitchCamera} />
      </CameraView>
      <BubbleOverlay items={bubbleItems} loading={loading} onDismiss={handleDismiss} onDismissAll={handleDismissAll} onBubbleAppear={(text) => { if (voiceEnabled) checkAndSpeak(text); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  camera: { flex: 1, width: '100%' },
});

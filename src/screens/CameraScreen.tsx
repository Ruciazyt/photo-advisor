import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Colors } from '../constants/colors';
import { BubbleOverlay, BubbleItem } from '../components/BubbleOverlay';
import { KeypointOverlay, Keypoint } from '../components/KeypointOverlay';
import { ComparisonOverlay } from '../components/ComparisonOverlay';
import { useCameraCapture, supportsRawCapture } from '../hooks/useCameraCapture';
import { ModeSelector } from '../components/ModeSelector';
import { CameraToolbar } from '../components/CameraToolbar';
import { GridOverlay, GridVariant } from '../components/GridOverlay';
import { GridSelectorModal } from '../components/GridSelectorModal';
import { ConfigWarning } from '../components/ConfigWarning';
import { PermissionGate } from '../components/PermissionGate';
import { LevelIndicator } from '../components/LevelIndicator';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown, TimerDuration } from '../hooks/useCountdown';
import { HistogramOverlay } from '../components/HistogramOverlay';
import { useHistogram } from '../hooks/useHistogram';
import { SunPositionOverlay, SunToggleButton } from '../components/SunPositionOverlay';
import { FocusGuideOverlay } from '../components/FocusGuideOverlay';
import { ShareButton } from '../components/ShareButton';
import { useFavorites } from '../hooks/useFavorites';
import { useVoiceFeedback } from '../hooks/useVoiceFeedback';
import { BurstSuggestionOverlay, detectBurstMoment } from '../components/BurstSuggestionOverlay';
import { CompositionScoreOverlay } from '../components/CompositionScoreOverlay';
import { useCompositionScore } from '../hooks/useCompositionScore';
import { recognizeScene, loadApiConfig } from '../services/api';
import { loadAppSettings } from '../services/settings';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

const GRID_ORDER: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法',
  golden: '黄金分割',
  diagonal: '对角线',
  spiral: '螺旋线',
  none: '关闭',
};

const TIMER_DURATIONS: TimerDuration[] = [3, 5, 10];

function textToBubbleItem(text: string, index: number): BubbleItem {
  const positionMap: Record<string, BubbleItem['position']> = {
    '[左上]': 'top-left',
    '[右上]': 'top-right',
    '[左下]': 'bottom-left',
    '[右下]': 'bottom-right',
    '[中间]': 'center',
  };
  const roundRobin: BubbleItem['position'][] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  let position: BubbleItem['position'] = roundRobin[index % roundRobin.length];
  for (const [tag, pos] of Object.entries(positionMap)) {
    if (text.includes(tag)) { position = pos; break; }
  }
  return { id: index, text, position };
}

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CameraMode>('photo');
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [gridVariant, setGridVariant] = useState<GridVariant>('thirds');
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(3);
  const [showHistogram, setShowHistogram] = useState(false);
  const [showLevel, setShowLevel] = useState(true);
  const [showSunOverlay, setShowSunOverlay] = useState(false);
  const [showFocusGuide, setShowFocusGuide] = useState(false);
  const histogramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const lastCapturedBase64Ref = useRef<string | null>(null);
  const [lastCapturedScore, setLastCapturedScore] = useState<number | null>(null);
  const [lastCapturedScoreReason, setLastCapturedScoreReason] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));
  const [toastMessage, setToastMessage] = useState('已收藏！');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [rawSupported, setRawSupported] = useState(false);

  // ---- Burst mode state ----
  const [burstActive, setBurstActive] = useState(false);
  const [burstCount, setBurstCount] = useState(0);

  // ---- Burst suggestion state ----
  const [showBurstSuggestion, setShowBurstSuggestion] = useState(false);
  const burstSuggestionText = useRef('');

  const { checkAndSpeak } = useVoiceFeedback();

  // Load app-wide settings on mount
  useEffect(() => {
    loadAppSettings().then((settings) => {
      setVoiceEnabled(settings.voiceEnabled);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect RAW support on mount
  useEffect(() => {
    supportsRawCapture().then(setRawSupported);
  }, []);
  const { saveFavorite } = useFavorites();

  // ---- Composition scoring ----
  const [showScoreOverlay, setShowScoreOverlay] = useState(false);
  const [scoreOverlayResult, setScoreOverlayResult] = useState<import('../hooks/useCompositionScore').CompositionScoreResult | null>(null);
  const lastCaptureIdRef = useRef<number>(0);
  const {
    computeScore,
    session: challengeSession,
    challengeMode,
    toggleChallengeMode,
    addScore,
    resetSession,
  } = useCompositionScore();

  const { takePicture, runAnalysis, savePhotoToGallery } = useCameraCapture({
    cameraRef,
    cameraReady,
    onSuggestionsChange: setSuggestions,
    onLoadingChange: setLoading,
    onKeypointsChange: setKeypoints,
    onShowKeypointsChange: setShowKeypoints,
  });

  const { histogramData, capture: captureHistogram } = useHistogram();

  const doCapture = useCallback(async () => {
    // Increment capture ID so score effect only fires for this capture
    lastCaptureIdRef.current += 1;
    const captureId = lastCaptureIdRef.current;
    setShowScoreOverlay(false);

    const result = await takePicture(rawMode);
    if (!result) {
      setSuggestions(['错误: 无法获取相机画面']);
      setLoading(false);
      return;
    }
    const { base64, uri: originalUri } = result;
    await savePhotoToGallery(originalUri);
    setLastCapturedUri(originalUri);
    lastCapturedBase64Ref.current = base64;
    const gridPromptMap: Record<GridVariant, string> = {
      thirds: '三分法网格',
      golden: '黄金分割网格',
      diagonal: '对角线网格',
      spiral: '螺旋线网格',
      none: '无网格',
    };
    const gridPromptNote = `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`;
    await runAnalysis(base64, gridPromptNote);

    // After analysis, check if this is a burst-worthy moment
    setTimeout(() => {
      if (!burstActive && detectBurstMoment(suggestions)) {
        burstSuggestionText.current = suggestions.find(s =>
          ['完美', '精彩', '理想', '绝佳', '优秀', '抓拍', '瞬间', '表情'].some(k => s.includes(k))
        ) || '检测到精彩画面，建议开启连拍捕捉更多瞬间！';
        setShowBurstSuggestion(true);
      }
    }, 100);
  }, [takePicture, runAnalysis, savePhotoToGallery, gridVariant, burstActive, suggestions]);

  // Burst mode: rapid sequential capture
  const startBurst = useCallback(() => {
    if (burstActive) return;
    setBurstActive(true);
    setBurstCount(0);
    let shot = 0;
    const burstInterval = setInterval(() => {
      doCapture();
      shot++;
      setBurstCount(shot);
      if (shot >= 5) {
        clearInterval(burstInterval);
        setBurstActive(false);
        setSuggestions(prev => [...prev, `连拍完成：共${shot}张`]);
      }
    }, 700);
  }, [burstActive, doCapture]);

  const { active: countdownActive, count: countdownCount, startCountdown, cancelCountdown } = useCountdown({
    onComplete: doCapture,
  });

  const cycleTimerDuration = useCallback(() => {
    const nextIdx = (TIMER_DURATIONS.indexOf(timerDuration) + 1) % TIMER_DURATIONS.length;
    setTimerDuration(TIMER_DURATIONS[nextIdx]);
  }, [timerDuration]);

  useEffect(() => {
    import('../services/api').then(({ loadApiConfig }) => {
      loadApiConfig().then((config) => {
        setApiConfigured(!!config);
      });
    });
  }, []);

  // ---- Score overlay: fires when keypoints are updated from analysis ----
  const prevKeypointsRef = useRef<Keypoint[]>([]);
  useEffect(() => {
    if (!showKeypoints || keypoints.length === 0) return;
    // Only respond to new keypoints (different from previous)
    if (keypoints === prevKeypointsRef.current) return;
    prevKeypointsRef.current = keypoints;

    const currentCaptureId = lastCaptureIdRef.current;
    // Defer slightly so keypoints are fully populated
    const timer = setTimeout(() => {
      if (lastCaptureIdRef.current !== currentCaptureId) return; // stale
      const result = computeScore(keypoints, gridVariant);
      setScoreOverlayResult(result);
      setShowScoreOverlay(true);
      if (challengeMode) {
        addScore(result.score);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [keypoints, showKeypoints, computeScore, gridVariant, challengeMode, addScore]);

  const handleAskAI = useCallback(async () => {
    if (countdownActive || loading || burstActive) return;
    setLoading(true);
    startCountdown(timerDuration);
  }, [countdownActive, loading, burstActive, startCountdown, timerDuration]);

  const handleGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    if (!uri) {
      setSuggestions(['错误: 无法读取图片']);
      return;
    }

    let base64 = '';
    try {
      try {
        const resized = await manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
      } catch (e) {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      }
    } catch {
      setSuggestions(['错误: 无法读取图片']);
      return;
    }

    if (!base64 || base64.length < 1000) {
      setSuggestions(['错误: 图片数据异常']);
      return;
    }

    await runAnalysis(base64);
  }, [runAnalysis]);

  const handleDismiss = useCallback((id: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== id));
    setKeypoints(prev => {
      const next = prev.filter(kp => kp.id !== id);
      if (next.length === 0) setShowKeypoints(false);
      return next;
    });
  }, []);

  const handleDismissAll = useCallback(() => {
    setSuggestions([]);
    setKeypoints([]);
    setShowKeypoints(false);
  }, []);

  const handleSwitchCamera = useCallback(() => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  const handleHistogramToggle = useCallback(async () => {
    if (showHistogram) {
      setShowHistogram(false);
      return;
    }
    await captureHistogram(cameraRef);
    setShowHistogram(true);
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    histogramTimerRef.current = setTimeout(() => {
      setShowHistogram(false);
    }, 5000);
  }, [showHistogram, captureHistogram]);

  const handleHistogramPressIn = useCallback(async () => {
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    await captureHistogram(cameraRef);
    setShowHistogram(true);
  }, [captureHistogram]);

  const handleHistogramPressOut = useCallback(() => {
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    histogramTimerRef.current = setTimeout(() => {
      setShowHistogram(false);
    }, 2000);
  }, []);

  const handleRawToggle = useCallback(() => {
    if (!rawSupported && !rawMode) {
      showToast('RAW仅支持Android设备');
      return;
    }
    setRawMode(v => !v);
  }, [rawSupported, rawMode]);

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const computeScoreFromSuggestions = (sugs: string[]): { score: number; reason: string } => {
    const positive = ['好', '优秀', '完美', '不错', '佳'];
    const negative = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
    let pos = 0;
    let neg = 0;
    for (const s of sugs) {
      for (const p of positive) { if (s.includes(p)) pos++; }
      for (const n of negative) { if (s.includes(n)) neg++; }
    }
    let score = 50 + Math.min(pos * 20, 40) - Math.min(neg * 15, 45);
    score = Math.max(0, Math.min(100, score));
    const reason = sugs.length > 0 ? sugs[0].replace(/^[^\u4e00-\u9fa5]*/, '').trim().slice(0, 30) : '';
    return { score, reason };
  };

  const handleSaveToFavorites = useCallback(async () => {
    if (!lastCapturedUri) return;
    const config = await loadApiConfig();
    let sceneTag = '';
    if (config && lastCapturedBase64Ref.current) {
      showToast('正在识别场景...');
      sceneTag = await recognizeScene(lastCapturedBase64Ref.current, config);
    }
    const { score, reason } = computeScoreFromSuggestions(suggestions);
    setLastCapturedScore(score);
    setLastCapturedScoreReason(reason);
    await saveFavorite(lastCapturedUri, GRID_LABELS[gridVariant], '', sceneTag || undefined, score, reason);
    showToast('已收藏！');
  }, [lastCapturedUri, saveFavorite, gridVariant, suggestions]);

  const handleBurstSuggestionAccept = useCallback(() => {
    setShowBurstSuggestion(false);
    startBurst();
  }, [startBurst]);

  const handleBurstSuggestionDismiss = useCallback(() => {
    setShowBurstSuggestion(false);
  }, []);

  const bubbleItems: BubbleItem[] = suggestions
    .map((text, i) => textToBubbleItem(text, i));

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionGate
        title="需要相机权限"
        icon="camera-outline"
        message="拍摄参谋需要访问您的相机来拍摄照片"
        buttonText="授权相机"
        onRequest={requestPermission}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
      >
        <ConfigWarning visible={!apiConfigured} />

        <GridOverlay variant={gridVariant} />

        <GridSelectorModal
          visible={showGridModal}
          selectedVariant={gridVariant}
          onSelect={(v) => { setGridVariant(v); setShowGridModal(false); }}
          onClose={() => setShowGridModal(false)}
        />
        {showLevel && <LevelIndicator />}
        <HistogramOverlay histogramData={histogramData} visible={showHistogram} />
        <FocusGuideOverlay visible={showFocusGuide} cameraRef={cameraRef} />
        <SunPositionOverlay visible={showSunOverlay} />

        {/* Burst Suggestion Overlay */}
        <BurstSuggestionOverlay
          visible={showBurstSuggestion && !burstActive}
          suggestion={burstSuggestionText.current}
          onAccept={handleBurstSuggestionAccept}
          onDismiss={handleBurstSuggestionDismiss}
        />

        {/* Grid Type Selector */}
        <TouchableOpacity
          style={styles.gridSelector}
          onPress={() => setShowGridModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.gridSelectorText}>📐 {GRID_LABELS[gridVariant]}</Text>
        </TouchableOpacity>

        {/* Histogram Toggle */}
        <TouchableOpacity
          style={[styles.histogramSelector, showHistogram && styles.histogramSelectorActive]}
          onPress={handleHistogramToggle}
          onPressIn={handleHistogramPressIn}
          onPressOut={handleHistogramPressOut}
          activeOpacity={0.7}
        >
          <Text style={styles.histogramSelectorText}>📊 直方图</Text>
        </TouchableOpacity>

        {/* Level Toggle */}
        <TouchableOpacity
          style={[styles.levelSelector, showLevel && styles.levelSelectorActive]}
          onPress={() => setShowLevel(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.levelSelectorText, showLevel && styles.levelSelectorTextActive]}>🔮 水平仪</Text>
        </TouchableOpacity>

        {/* Sun Position Toggle */}
        <SunToggleButton
          visible={showSunOverlay}
          onPress={() => setShowSunOverlay(v => !v)}
        />

        {/* Focus Guide Toggle */}
        <TouchableOpacity
          style={[styles.focusGuideSelector, showFocusGuide && styles.focusGuideSelectorActive]}
          onPress={() => setShowFocusGuide(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.focusGuideSelectorText, showFocusGuide && styles.focusGuideSelectorTextActive]}>🎯 对焦</Text>
        </TouchableOpacity>

        {/* Voice Toggle */}
        <TouchableOpacity
          style={[styles.voiceSelector, voiceEnabled && styles.voiceSelectorActive]}
          onPress={() => setVoiceEnabled(v => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={voiceEnabled ? 'volume-high' : 'volume-mute'}
            size={16}
            color={voiceEnabled ? Colors.accent : 'rgba(255,255,255,0.6)'}
          />
          <Text style={[styles.voiceSelectorText, voiceEnabled && styles.voiceSelectorTextActive]}>语音</Text>
        </TouchableOpacity>

        {/* RAW Toggle */}
        <TouchableOpacity
          style={[styles.rawSelector, rawMode && styles.rawSelectorActive]}
          onPress={handleRawToggle}
          activeOpacity={0.7}
        >
          <Text style={[styles.rawSelectorText, rawMode && styles.rawSelectorTextActive]}>📷 RAW</Text>
        </TouchableOpacity>

        {/* Challenge Mode Toggle */}
        <TouchableOpacity
          style={[styles.challengeSelector, challengeMode && styles.challengeSelectorActive]}
          onPress={toggleChallengeMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.challengeSelectorText, challengeMode && styles.challengeSelectorTextActive]}>🎮 挑战</Text>
        </TouchableOpacity>

        {/* Timer Duration Selector */}
        <TouchableOpacity
          style={[styles.timerSelector, countdownActive && styles.timerSelectorActive]}
          onPress={countdownActive ? cancelCountdown : cycleTimerDuration}
          activeOpacity={0.7}
        >
          <Text style={styles.timerSelectorText}>
            {countdownActive ? '✕ 取消' : `⏱ ${timerDuration}s`}
          </Text>
        </TouchableOpacity>

        {/* Save to Favorites */}
        <TouchableOpacity
          style={[styles.favoriteSelector, !lastCapturedUri && styles.favoriteSelectorDisabled]}
          onPress={handleSaveToFavorites}
          disabled={!lastCapturedUri}
          activeOpacity={0.7}
        >
          <Ionicons name="heart" size={18} color={lastCapturedUri ? '#FF6B8A' : '#555'} />
        </TouchableOpacity>

        {/* Share Button */}
        <ShareButton
          photoUri={lastCapturedUri ?? ''}
          suggestions={suggestions}
          gridType={GRID_LABELS[gridVariant]}
          score={lastCapturedScore ?? undefined}
          gridVariant={gridVariant}
        />

        {/* Compare Mode */}
        {lastCapturedUri && !showKeypoints && (
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => setShowComparison(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.compareBtnText}>🖼️ 对比</Text>
          </TouchableOpacity>
        )}

        {/* Burst Mode Indicator */}
        {burstActive && (
          <View style={styles.burstIndicator}>
            <Ionicons name="flash" size={14} color="#FFD700" />
            <Text style={styles.burstText}>连拍中 {burstCount}/5</Text>
          </View>
        )}

        {/* Toast */}
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>

        <KeypointOverlay keypoints={keypoints} visible={showKeypoints} />

        {/* Composition Score Overlay */}
        {showScoreOverlay && scoreOverlayResult && (
          <CompositionScoreOverlay
            result={scoreOverlayResult}
            challengeMode={challengeMode}
            session={challengeSession}
            onDismiss={() => setShowScoreOverlay(false)}
          />
        )}

        {/* Countdown Overlay */}
        {countdownActive && (
          <CountdownOverlay
            key={countdownCount}
            count={countdownCount}
            onComplete={doCapture}
          />
        )}

        <View style={styles.toolbarWrapper}>
          <ModeSelector selectedMode={selectedMode} onModeChange={setSelectedMode} />

          <CameraToolbar
            onGallery={handleGallery}
            onAskAI={handleAskAI}
            onSwitchCamera={handleSwitchCamera}
          />
        </View>
      </CameraView>

      <BubbleOverlay
        items={bubbleItems}
        loading={loading}
        onDismiss={handleDismiss}
        onDismissAll={handleDismissAll}
        onBubbleAppear={(text) => { if (voiceEnabled) checkAndSpeak(text); }}
      />

      <ComparisonOverlay
        imageUri={lastCapturedUri!}
        keypoints={keypoints}
        bubbles={bubbleItems}
        visible={showComparison}
        onClose={() => setShowComparison(false)}
        score={lastCapturedScore ?? undefined}
        scoreReason={lastCapturedScoreReason ?? undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  toolbarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  gridSelector: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  gridSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  histogramSelector: {
    position: 'absolute',
    top: 60,
    left: 244,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  histogramSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.35)',
    borderColor: 'rgba(232,213,183,0.6)',
  },
  histogramSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  levelSelector: {
    position: 'absolute',
    top: 60,
    left: 330,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  levelSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.35)',
    borderColor: 'rgba(232,213,183,0.6)',
  },
  levelSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  levelSelectorTextActive: {
    color: '#FFFFFF',
  },
  timerSelector: {
    position: 'absolute',
    top: 60,
    left: 130,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timerSelectorActive: {
    backgroundColor: 'rgba(255,82,82,0.6)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timerSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  favoriteSelector: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  favoriteSelectorDisabled: {
    opacity: 0.5,
  },
  compareBtn: {
    position: 'absolute',
    top: 60,
    right: 70,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 15,
  },
  compareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,138,0.9)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voiceSelector: {
    position: 'absolute',
    top: 60,
    left: 195,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.2)',
    borderColor: Colors.accent,
  },
  voiceSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  voiceSelectorTextActive: {
    color: Colors.accent,
  },
  challengeSelector: {
    position: 'absolute',
    top: 110,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeSelectorActive: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: 'rgba(255,215,0,0.6)',
  },
  challengeSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  challengeSelectorTextActive: {
    color: '#FFD700',
  },
  rawSelector: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rawSelectorActive: {
    backgroundColor: 'rgba(0,200,100,0.2)',
    borderColor: 'rgba(0,200,100,0.6)',
  },
  rawSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  rawSelectorTextActive: {
    color: '#00C864',
  },
  focusGuideSelector: {
    position: 'absolute',
    top: 60,
    left: 300,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusGuideSelectorActive: {
    backgroundColor: 'rgba(255,220,0,0.15)',
    borderColor: 'rgba(255,220,0,0.5)',
  },
  focusGuideSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  focusGuideSelectorTextActive: {
    color: '#FFDC00',
  },
  burstIndicator: {
    position: 'absolute',
    top: 60,
    right: 70,
    backgroundColor: 'rgba(255,215,0,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 15,
  },
  burstText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
});

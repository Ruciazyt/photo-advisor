import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Colors } from '../constants/colors';
import { BubbleOverlay, BubbleItem } from '../components/BubbleOverlay';
import { KeypointOverlay, Keypoint, bubbleTextToKeypoint } from '../components/KeypointOverlay';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { ModeSelector } from '../components/ModeSelector';
import { CameraToolbar } from '../components/CameraToolbar';
import { GridOverlay, GridVariant } from '../components/GridOverlay';
import { ConfigWarning } from '../components/ConfigWarning';
import { PermissionGate } from '../components/PermissionGate';
import { LevelIndicator } from '../components/LevelIndicator';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { useCountdown, TimerDuration } from '../hooks/useCountdown';
import { HistogramOverlay } from '../components/HistogramOverlay';
import { useHistogram } from '../hooks/useHistogram';
import { useFavorites } from '../hooks/useFavorites';

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
  const histogramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  const { saveFavorite } = useFavorites();

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
    const result = await takePicture();
    if (!result) {
      setSuggestions(['错误: 无法获取相机画面']);
      setLoading(false);
      return;
    }
    const { base64, uri: originalUri } = result;
    await savePhotoToGallery(originalUri);
    setLastCapturedUri(originalUri);
    const gridPromptMap: Record<GridVariant, string> = {
      thirds: '三分法网格',
      golden: '黄金分割网格',
      diagonal: '对角线网格',
      spiral: '螺旋线网格',
      none: '无网格',
    };
    const gridPromptNote = `画面已叠加${gridPromptMap[gridVariant]}参考线。请根据网格线区域提供构图位置建议。`;
    await runAnalysis(base64, gridPromptNote);
  }, [takePicture, runAnalysis, savePhotoToGallery, gridVariant]);

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

  const handleAskAI = useCallback(async () => {
    if (countdownActive || loading) return;
    setLoading(true);
    startCountdown(timerDuration);
  }, [countdownActive, loading, startCountdown, timerDuration]);

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
        console.log('[handleGallery] resized:', resized.uri, resized.width, 'x', resized.height);
        base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
        console.log('[handleGallery] resized base64 length:', base64.length);
      } catch (e) {
        console.log('[handleGallery] resize failed:', e);
      }

      if (!base64 || base64.length < 1000) {
        console.log('[handleGallery] reading from original uri');
        await new Promise(resolve => setTimeout(resolve, 100));
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        console.log('[handleGallery] original base64 length:', base64.length);
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

  const cycleGridVariant = useCallback(() => {
    const idx = GRID_ORDER.indexOf(gridVariant);
    setGridVariant(GRID_ORDER[(idx + 1) % GRID_ORDER.length]);
  }, [gridVariant]);

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
    if (histogramTimerRef.current) {
      clearTimeout(histogramTimerRef.current);
      histogramTimerRef.current = null;
    }
    await captureHistogram(cameraRef);
    setShowHistogram(true);
  }, [captureHistogram]);

  const handleHistogramPressOut = useCallback(() => {
    if (histogramTimerRef.current) clearTimeout(histogramTimerRef.current);
    histogramTimerRef.current = setTimeout(() => {
      setShowHistogram(false);
    }, 2000);
  }, []);

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleSaveToFavorites = useCallback(async () => {
    if (!lastCapturedUri) return;
    await saveFavorite(lastCapturedUri, GRID_LABELS[gridVariant]);
    showToast();
  }, [lastCapturedUri, saveFavorite, gridVariant]);

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
        <LevelIndicator />
        <HistogramOverlay histogramData={histogramData} visible={showHistogram} />

        {/* Grid Type Selector */}
        <TouchableOpacity
          style={styles.gridSelector}
          onPress={cycleGridVariant}
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

        {/* Toast */}
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastText}>已收藏！</Text>
        </Animated.View>

        <KeypointOverlay keypoints={keypoints} visible={showKeypoints} />

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
});

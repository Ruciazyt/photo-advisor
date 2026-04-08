import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic, MINIMAX_MODELS } from '../services/api';
import { BubbleOverlay, BubbleItem } from '../components/BubbleOverlay';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

/** Parse a raw text stream chunk into complete suggestion sentences.
 *  Splits on newlines or Chinese sentence-ending punctuation. */
function parseSuggestions(buffer: string, newChunk: string): { done: string[]; remaining: string } {
  const combined = buffer + newChunk;
  // Split on newlines or sentences ending with 。！？；
  const parts = combined.split(/(?<=[。！？；\n])/);
  const remaining = parts.pop() ?? '';
  const done = parts.map(p => p.trim()).filter(p => p.length > 0 && p.startsWith('['));
  return { done, remaining };
}

function textToBubbleItem(text: string, index: number): BubbleItem {
  const positionMap: Record<string, BubbleItem['position']> = {
    '[左上]': 'top-left',
    '[右上]': 'top-right',
    '[左下]': 'bottom-left',
    '[右下]': 'bottom-right',
    '[中间]': 'center',
  };
  let position: BubbleItem['position'] = 'center';
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

  // Buffer for streaming text that hasn't formed a complete sentence yet
  const textBufferRef = useRef('');

  useEffect(() => {
    loadApiConfig().then((config) => {
      setApiConfigured(!!config);
    });
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (!photo?.uri) return null;
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let base64 = '';
      try {
        const resized = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        console.log('[takePicture] resized:', resized.uri, resized.width, 'x', resized.height);
        base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
        console.log('[takePicture] resized base64 length:', base64.length);
      } catch (e) {
        console.log('[takePicture] resize failed, using original:', e);
      }
      
      if (!base64 || base64.length < 1000) {
        console.log('[takePicture] reading from original photo.uri');
        base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
        console.log('[takePicture] original base64 length:', base64.length);
      }
      
      if (!base64 || base64.length < 1000) return null;
      return base64;
    } catch {
      return null;
    }
  }, [cameraReady]);

  const runAnalysis = useCallback(async (base64: string, extraPrompt?: string) => {
    textBufferRef.current = '';
    setSuggestions([]);
    setLoading(true);

    const config = await loadApiConfig();
    if (!config) {
      setLoading(false);
      Alert.alert('请先在设置中配置API');
      return;
    }

    try {
      if (config.apiType === 'minimax') {
        await analyzeImageAnthropic(
          base64,
          config.apiKey,
          config.model,
          (chunk) => {
            const { done, remaining } = parseSuggestions(textBufferRef.current, chunk);
            textBufferRef.current = remaining;
            if (done.length > 0) {
              setSuggestions(prev => [...prev, ...done]);
            }
          },
          extraPrompt,
        );
        // Flush remaining buffer
        if (textBufferRef.current.trim()) {
          setSuggestions(prev => [...prev, textBufferRef.current.trim()]);
        }
        setLoading(false);
      } else {
        await streamChatCompletion(
          config.apiKey,
          config.baseUrl,
          config.model,
          base64,
          (chunk, done) => {
            if (done) {
              if (textBufferRef.current.trim()) {
                setSuggestions(prev => [...prev, textBufferRef.current.trim()]);
              }
              setLoading(false);
            } else {
              const { done: doneParts, remaining } = parseSuggestions(textBufferRef.current, chunk);
              textBufferRef.current = remaining;
              if (doneParts.length > 0) {
                setSuggestions(prev => [...prev, ...doneParts]);
              }
            }
          },
          extraPrompt,
        );
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSuggestions([`错误: ${msg}`]);
    }
  }, []);

  const handleAskAI = useCallback(async () => {
    const base64 = await takePicture();
    if (!base64) {
      setSuggestions(['错误: 无法获取相机画面']);
      return;
    }
    const gridPromptNote = '画面已叠加三分法网格线（横竖各2条等分线）。请根据网格线区域提供构图位置建议。';
    await runAnalysis(base64, gridPromptNote);
  }, [takePicture, runAnalysis]);

  const handleGallery = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('权限不足', '需要相册权限才能选择照片');
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
  }, []);

  const handleDismissAll = useCallback(() => {
    setSuggestions([]);
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
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color={Colors.accent} />
        <Text style={styles.permissionTitle}>需要相机权限</Text>
        <Text style={styles.permissionText}>拍摄参谋需要访问您的相机来拍摄照片</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>授权相机</Text>
        </TouchableOpacity>
      </View>
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
        {!apiConfigured && (
          <View style={styles.configWarning}>
            <Text style={styles.configWarningText}>⚠️ 请先配置API</Text>
          </View>
        )}

        {/* Grid Overlay — rule of thirds */}
        <GridOverlay />

        {/* Toolbar wrapper: flex column, fills camera bottom space */}
        <View style={styles.toolbarWrapper}>
          {/* Mode selector bar */}
          <View style={styles.modeSelector}>
            {(['photo', 'scan', 'video', 'portrait'] as CameraMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeBtn, selectedMode === mode && styles.modeBtnActive]}
                onPress={() => setSelectedMode(mode)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    selectedMode === mode && styles.modeBtnTextActive,
                  ]}
                >
                  {mode === 'photo' ? '拍照' : mode === 'scan' ? '扫码' : mode === 'video' ? '视频' : '人像'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom toolbar: Gallery | Ask AI | Switch Camera */}
          <View style={styles.toolbar}>
            {/* Left: Gallery */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={handleGallery}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Center: Ask AI */}
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleAskAI}
              activeOpacity={0.7}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>

            {/* Right: Switch Camera */}
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
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

function GridOverlay() {
  return (
    <View style={gridStyles.overlay} pointerEvents="none">
      {/* Horizontal lines: 1/3 and 2/3 */}
      <View style={gridStyles.h1} />
      <View style={gridStyles.h2} />
      {/* Vertical lines: 1/3 and 2/3 */}
      <View style={gridStyles.v1} />
      <View style={gridStyles.v2} />
    </View>
  );
}

const gridStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  h1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  h2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  v1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  v2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  configWarning: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'center',
    marginTop: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  configWarningText: {
    color: Colors.accent,
    fontSize: 13,
  },
  toolbarWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  modeBtnActive: {
    backgroundColor: Colors.accent,
  },
  modeBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeBtnTextActive: {
    color: Colors.primary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 12,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  toolBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    color: Colors.accent,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop: 24,
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  permissionBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});

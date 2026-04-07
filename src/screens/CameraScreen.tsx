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
import { StreamingDrawer } from '../components/StreamingDrawer';

type CameraMode = 'photo' | 'scan' | 'video' | 'portrait';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [selectedMode, setSelectedMode] = useState<CameraMode>('photo');

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

  const handleAskAI = useCallback(async () => {
    const config = await loadApiConfig();
    if (!config) {
      Alert.alert('请先在设置中配置API');
      return;
    }

    setDrawerVisible(true);
    setStreamingText('');
    setLoading(true);

    const base64 = await takePicture();
    if (!base64) {
      setLoading(false);
      setStreamingText('错误: 无法获取相机画面');
      return;
    }

    const gridPromptNote = '画面已叠加三分法网格线（横竖各2条等分线）。请根据网格线区域提供构图位置建议。';

    try {
      if (config.apiType === 'minimax') {
        await analyzeImageAnthropic(
          base64,
          config.apiKey,
          config.model,
          (text) => {
            setStreamingText((prev) => prev + text);
          },
          gridPromptNote,
        );
        setLoading(false);
      } else {
        await streamChatCompletion(
          config.apiKey,
          config.baseUrl,
          config.model,
          base64,
          (text, done) => {
            if (done) {
              setLoading(false);
            } else {
              setStreamingText((prev) => prev + text);
            }
          },
          gridPromptNote,
        );
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setStreamingText(`错误: ${msg}`);
    }
  }, [takePicture]);

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
      Alert.alert('错误', '无法读取图片');
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
      setLoading(false);
      setStreamingText('错误: 无法读取图片');
      return;
    }

    if (!base64 || base64.length < 1000) {
      setLoading(false);
      setStreamingText('错误: 图片数据异常');
      return;
    }

    const config = await loadApiConfig();
    if (!config) {
      setLoading(false);
      Alert.alert('请先在设置中配置API');
      return;
    }

    setDrawerVisible(true);
    setStreamingText('');
    setLoading(true);

    try {
      if (config.apiType === 'minimax') {
        await analyzeImageAnthropic(
          base64,
          config.apiKey,
          config.model,
          (text) => {
            setStreamingText((prev) => prev + text);
          },
        );
        setLoading(false);
      } else {
        await streamChatCompletion(
          config.apiKey,
          config.baseUrl,
          config.model,
          base64,
          (text, done) => {
            if (done) {
              setLoading(false);
            } else {
              setStreamingText((prev) => prev + text);
            }
          },
        );
      }
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      setStreamingText(`错误: ${msg}`);
    }
  }, []);

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

        {/* AI Suggestion Overlay — centered on camera preview */}
        {streamingText.length > 0 && (
          <View style={styles.aiOverlay} pointerEvents="none">
            <View style={styles.aiOverlayBg}>
              <Text style={styles.aiOverlayText}>{streamingText}</Text>
            </View>
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

      <StreamingDrawer
        visible={drawerVisible}
        text={streamingText}
        loading={loading}
        onClose={() => setDrawerVisible(false)}
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
  aiOverlay: {
    position: 'absolute',
    top: '20%',
    left: 16,
    right: 16,
    zIndex: 5,
    alignItems: 'center',
  },
  aiOverlayBg: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: '100%',
  },
  aiOverlayText: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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

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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/colors';
import { loadApiConfig, streamChatCompletion } from '../services/api';
import { StreamingDrawer } from '../components/StreamingDrawer';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);

  useEffect(() => {
    loadApiConfig().then((config) => {
      setApiConfigured(!!config);
    });
  }, []);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });
      return photo?.base64 ?? null;
    } catch {
      return null;
    }
  }, [cameraReady]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;

    // Flash feedback
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 150);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (photo?.uri) {
        // Optionally save to gallery or show success
        Alert.alert('已拍摄', '照片已保存');
      }
    } catch {
      Alert.alert('拍摄失败', '请重试');
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

    try {
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
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const base64 = asset.base64 ?? '';

    const config = await loadApiConfig();
    if (!config) {
      Alert.alert('请先在设置中配置API');
      return;
    }

    setDrawerVisible(true);
    setStreamingText('');
    setLoading(true);

    try {
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
        {/* Flash overlay */}
        {captureFlash && <View style={styles.flashOverlay} />}

        {!apiConfigured && (
          <View style={styles.configWarning}>
            <Text style={styles.configWarningText}>⚠️ 请先配置API</Text>
          </View>
        )}

        {/* Bottom toolbar: Gallery | Capture | Ask AI */}
        <View style={styles.toolbar}>
          {/* Left: Gallery */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handleGallery}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Center: Capture */}
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={handleCapture}
            activeOpacity={0.7}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          {/* Right: Ask AI */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={handleAskAI}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={28} color="#fff" />
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    opacity: 0.6,
  },
  configWarning: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'center',
    marginTop: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  configWarningText: {
    color: Colors.accent,
    fontSize: 13,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
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

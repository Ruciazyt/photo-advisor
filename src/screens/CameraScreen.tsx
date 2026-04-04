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
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic, MINIMAX_MODELS } from '../services/api';
import { StreamingDrawer } from '../components/StreamingDrawer';

export function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);

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
        
      });
      return photo?.base64 ?? null;
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
      quality: 0.9,
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

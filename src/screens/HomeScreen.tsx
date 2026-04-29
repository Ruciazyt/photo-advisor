import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic } from '../services/api';
import { StreamingDrawer } from '../components/StreamingDrawer';
import { logger } from '../utils/logger';

export function HomeScreen() {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);

  useEffect(() => {
    loadApiConfig().then((config) => {
      setApiConfigured(!!config);
    });
  }, []);

  const triggerAnalysis = async (base64: string) => {
    setDrawerVisible(true);
    const config = await loadApiConfig();
    if (!config) {
      setDrawerVisible(false);
      Alert.alert('请先在设置中配置API');
      return;
    }
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
  };

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('权限不足', `需要${useCamera ? '相机' : '相册'}权限才能选择照片`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: false,
        });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    if (!uri) {
      Alert.alert('错误', '无法读取图片URI，请重试');
      return;
    }

    setImageUri(uri);
    setLoading(true);
    setDrawerVisible(true);
    setStreamingText('');

    try {
      let base64 = '';
      
      // Try resize first; if it fails or produces tiny output, fall back to original
      try {
        const resized = await manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        logger.for('pickImage').debug('resized uri:', resized.uri, resized.width, 'x', resized.height);
        base64 = await FileSystem.readAsStringAsync(resized.uri, {
          encoding: 'base64',
        });
        logger.for('pickImage').debug('resized base64 length:', base64.length);
      } catch (resizeErr) {
        logger.for('pickImage').warn('resize failed, using original, err:', resizeErr);
      }
      
      // Fallback: if resize failed or base64 is too small, read original
      if (!base64 || base64.length < 1000) {
        logger.for('pickImage').debug('reading from original uri, current length:', base64?.length);
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: 'base64',
        });
        logger.for('pickImage').debug('original base64 length:', base64.length);
      }
      
      if (!base64 || base64.length < 100) {
        Alert.alert('错误', `图片数据异常(长度:${base64?.length ?? 0})，请重试`);
        setLoading(false);
        return;
      }
      setImageBase64(base64);
      await triggerAnalysis(base64);
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('读取失败', msg);
    }
  };

  const showImageOptions = () => {
    Alert.alert('选择照片', '请选择图片来源', [
      { text: '相机拍照', onPress: () => pickImage(true) },
      { text: '相册选择', onPress: () => pickImage(false) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const handleSend = useCallback(async () => {
    if (!imageBase64) {
      Alert.alert('请先选择照片');
      return;
    }

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
          imageBase64,
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
          imageBase64,
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
  }, [imageBase64]);

  return (
    <View style={[staticStyles.container, { backgroundColor: colors.primary }]}>
      <View style={staticStyles.header}>
        <Text style={[staticStyles.title, { color: colors.accent }]}>拍摄参谋</Text>
        <Text style={[staticStyles.subtitle, { color: colors.textSecondary }]}>智能照片分析</Text>
      </View>

      <TouchableOpacity style={[staticStyles.uploadArea, { borderColor: colors.border, backgroundColor: colors.cardBg }]} onPress={showImageOptions} activeOpacity={0.7}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={staticStyles.preview} resizeMode="cover" />
        ) : (
          <View style={staticStyles.uploadPlaceholder}>
            <Ionicons name="camera-outline" size={64} color={colors.accent} />
            <Text style={[staticStyles.uploadText, { color: colors.accent }]}>点击选择照片</Text>
            <Text style={[staticStyles.uploadHint, { color: colors.textSecondary }]}>支持相机拍摄或相册选择</Text>
          </View>
        )}
      </TouchableOpacity>

      {!apiConfigured && (
        <View style={[staticStyles.configWarning, { backgroundColor: colors.cardBg }]}>
          <Ionicons name="warning-outline" size={16} color={colors.accent} />
          <Text style={[staticStyles.configWarningText, { color: colors.accent }]}>请先配置API设置</Text>
        </View>
      )}

      <TouchableOpacity
        testID="sendButton"
        style={[
          staticStyles.sendBtn,
          { backgroundColor: colors.accent },
          (!imageBase64 || loading) && staticStyles.sendBtnDisabled,
        ]}
        onPress={handleSend}
        disabled={!imageBase64 || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
            <Text style={[staticStyles.sendBtnText, { color: colors.primary }]}>开始分析</Text>
          </>
        )}
      </TouchableOpacity>

      <StreamingDrawer
        visible={drawerVisible}
        text={streamingText}
        loading={loading}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  uploadArea: {
    flex: 1,
    maxHeight: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadHint: {
    fontSize: 13,
    marginTop: 8,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 16,
  },
  configWarningText: {
    fontSize: 13,
  },
  sendBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
});

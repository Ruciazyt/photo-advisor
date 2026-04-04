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
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic } from '../services/api';
import { StreamingDrawer } from '../components/StreamingDrawer';

export function HomeScreen() {
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
          
          base64: true,
          allowsEditing: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          
          base64: true,
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      Alert.alert('调试', `base64长度:${base64.length}`);
      if (!base64 || base64.length < 100) {
        Alert.alert('错误', `图片数据异常(长度:${base64.length})，请重试`);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>拍摄参谋</Text>
        <Text style={styles.subtitle}>智能照片分析</Text>
      </View>

      <TouchableOpacity style={styles.uploadArea} onPress={showImageOptions} activeOpacity={0.7}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="camera-outline" size={64} color={Colors.accent} />
            <Text style={styles.uploadText}>点击选择照片</Text>
            <Text style={styles.uploadHint}>支持相机拍摄或相册选择</Text>
          </View>
        )}
      </TouchableOpacity>

      {!apiConfigured && (
        <View style={styles.configWarning}>
          <Ionicons name="warning-outline" size={16} color={Colors.accent} />
          <Text style={styles.configWarningText}>请先配置API设置</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.sendBtn,
          (!imageBase64 || loading) && styles.sendBtnDisabled,
        ]}
        onPress={handleSend}
        disabled={!imageBase64 || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={Colors.primary} />
            <Text style={styles.sendBtnText}>开始分析</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    color: Colors.accent,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  uploadArea: {
    flex: 1,
    maxHeight: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.cardBg,
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
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 16,
  },
  configWarningText: {
    color: Colors.accent,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: Colors.accent,
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
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
});

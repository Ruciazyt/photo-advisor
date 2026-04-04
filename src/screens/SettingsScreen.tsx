import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import {
  loadApiConfig,
  saveApiConfig,
  fetchAvailableModels,
  Model,
} from '../services/api';
import {
  getAppVersion,
  checkForUpdate,
  openReleasePage,
  ReleaseInfo,
} from '../services/update';

interface Props {
  onSaved?: () => void;
}

export function SettingsScreen({ onSaved }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    loadApiConfig().then((config) => {
      if (config) {
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl);
        setSelectedModel(config.model);
      }
    });
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const release: ReleaseInfo | null = await checkForUpdate();
      if (!release) {
        Alert.alert('暂无可用更新', '暂无可用更新，或无法连接到更新服务器', [
          { text: '确定' },
        ]);
      } else {
        Alert.alert(
          `发现新版本 ${release.version}`,
          '是否前往下载页面？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '前往下载',
              onPress: () => {
                if (release.htmlUrl) openReleasePage(release.htmlUrl);
              },
            },
          ]
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('检查更新失败', msg);
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  const handleFetchModels = useCallback(async () => {
    if (!apiKey.trim() || !baseUrl.trim()) {
      Alert.alert('请先填写 API Key 和 Base URL');
      return;
    }
    setFetching(true);
    setLoadingModels(true);
    setModels([]);
    try {
      const result = await fetchAvailableModels(apiKey.trim(), baseUrl.trim());
      setModels(result);
      if (result.length === 0) {
        Alert.alert('未找到可用模型', '请检查 API 配置是否正确');
      } else if (result.length === 1) {
        setSelectedModel(result[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('获取模型列表失败', msg);
    } finally {
      setFetching(false);
      setLoadingModels(false);
    }
  }, [apiKey, baseUrl]);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      Alert.alert('请填写 API Key');
      return;
    }
    if (!baseUrl.trim()) {
      Alert.alert('请填写 Base URL');
      return;
    }
    if (!selectedModel) {
      Alert.alert('请选择模型');
      return;
    }
    setSaving(true);
    try {
      await saveApiConfig(apiKey.trim(), baseUrl.trim(), selectedModel);
      Alert.alert('保存成功', 'API 配置已保存', [
        { text: '确定', onPress: () => onSaved?.() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('保存失败', msg);
    } finally {
      setSaving(false);
    }
  }, [apiKey, baseUrl, selectedModel, onSaved]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>API 配置</Text>
          <Text style={styles.subtitle}>配置你的 AI 模型接口</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-xxxxxxxx"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Base URL</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://api.example.com/v1"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <TouchableOpacity
          style={[styles.fetchBtn, fetching && styles.fetchBtnDisabled]}
          onPress={handleFetchModels}
          disabled={fetching}
          activeOpacity={0.8}
        >
          {fetching ? (
            <ActivityIndicator color={Colors.accent} size="small" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={18} color={Colors.accent} />
              <Text style={styles.fetchBtnText}>获取模型列表</Text>
            </>
          )}
        </TouchableOpacity>

        {loadingModels && (
          <View style={styles.modelsLoading}>
            <ActivityIndicator color={Colors.accent} />
            <Text style={styles.modelsLoadingText}>正在获取模型...</Text>
          </View>
        )}

        {models.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>选择模型</Text>
            <View style={styles.modelList}>
              {models.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modelItem,
                    selectedModel === m.id && styles.modelItemSelected,
                  ]}
                  onPress={() => setSelectedModel(m.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modelItemText,
                      selectedModel === m.id && styles.modelItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {m.name || m.id}
                  </Text>
                  {selectedModel === m.id && (
                    <Ionicons name="checkmark" size={16} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Text style={styles.saveBtnText}>保存配置</Text>
          )}
        </TouchableOpacity>

        <View style={styles.versionSection}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>当前版本</Text>
            <Text style={styles.versionValue}>{getAppVersion()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.updateBtn, checkingUpdate && styles.updateBtnDisabled]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdate ? (
              <ActivityIndicator color={Colors.accent} size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={Colors.accent} />
                <Text style={styles.updateBtnText}>检查更新</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
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
  section: {
    marginBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 14,
    marginBottom: 16,
  },
  fetchBtnDisabled: {
    opacity: 0.6,
  },
  fetchBtnText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  modelsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  modelsLoadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  modelList: {
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modelItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  modelItemText: {
    color: Colors.text,
    fontSize: 14,
    flex: 1,
  },
  modelItemTextSelected: {
    color: Colors.accent,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  versionSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  versionValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingVertical: 12,
  },
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateBtnText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});

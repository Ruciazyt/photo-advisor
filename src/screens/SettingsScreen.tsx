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
import { useTheme } from '../contexts/ThemeContext';
import {
  loadApiConfig,
  saveApiConfig,
  fetchAvailableModels,
  testOpenAIConnection,
  testMinimaxConnection,
  Model,
  MINIMAX_MODELS,
} from '../services/api';
import {
  getAppVersion,
  checkForUpdate,
  showUpdateDialog,
  downloadAndInstall,
  openReleasePage,
} from '../services/update';
import { loadAppSettings, saveAppSettings } from '../services/settings';
import { speak } from '../hooks/useVoiceFeedback';

interface Props {
  onSaved?: () => void;
}

export function SettingsScreen({ onSaved }: Props) {
  const { theme, colors, toggleTheme } = useTheme();
  const [apiType, setApiType] = useState<'openai' | 'minimax'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    loadApiConfig().then((config) => {
      if (config) {
        setApiType(config.apiType);
        setApiKey(config.apiKey);
        setBaseUrl(config.baseUrl);
        setSelectedModel(config.model);
      }
    });
    loadAppSettings().then((settings) => {
      setVoiceEnabled(settings.voiceEnabled);
    });
  }, []);

  const currentVersion = getAppVersion();

  const handleApiTypeChange = (type: 'openai' | 'minimax') => {
    setApiType(type);
    setModels([]);
    setSelectedModel('');
    if (type === 'minimax') {
      setBaseUrl('');
    }
  };

  const handleCheckUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      const release = await checkForUpdate();
      if (!release) {
        Alert.alert('暂无可用更新', '暂无可用更新');
        return;
      }
      if (release.version === currentVersion) {
        Alert.alert('已是最新版本', `当前版本 v${currentVersion} 已是最新版本`);
        return;
      }
      showUpdateDialog(
        release,
        () => {
          if (release.downloadUrl) {
            downloadAndInstall(release.downloadUrl);
          } else {
            openReleasePage(release.htmlUrl);
          }
        },
        () => {}
      );
    } finally {
      setCheckingUpdate(false);
    }
  }, [currentVersion]);

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
      if (!result.ok) {
        Alert.alert('获取模型列表失败', result.error.message);
        return;
      }
      const fetchedModels = result.models;
      setModels(fetchedModels);
      if (fetchedModels.length === 0) {
        Alert.alert('未找到可用模型', '请检查 API 配置是否正确');
      } else if (fetchedModels.length === 1) {
        setSelectedModel(fetchedModels[0].id);
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
    if (apiType === 'openai' && !baseUrl.trim()) {
      Alert.alert('请填写 Base URL');
      return;
    }
    if (!selectedModel) {
      Alert.alert('请选择模型');
      return;
    }
    setSaving(true);
    try {
      await saveApiConfig(apiKey.trim(), baseUrl.trim(), selectedModel, apiType);
      Alert.alert('保存成功', 'API 配置已保存', [
        { text: '确定', onPress: () => onSaved?.() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('保存失败', msg);
    } finally {
      setSaving(false);
    }
  }, [apiKey, baseUrl, selectedModel, apiType, onSaved]);

  const handleTestConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      Alert.alert('请先填写 API Key');
      return;
    }
    if (apiType === 'openai' && !baseUrl.trim()) {
      Alert.alert('请先填写 Base URL');
      return;
    }
    setTesting(true);
    try {
      let result: { ok: boolean; error?: string };
      if (apiType === 'openai') {
        result = await testOpenAIConnection(apiKey.trim(), baseUrl.trim());
      } else {
        result = await testMinimaxConnection(apiKey.trim());
      }
      if (result.ok) {
        Alert.alert('✅ 连接成功', 'API 配置正常，可以正常使用');
      } else {
        Alert.alert('❌ 连接失败', result.error ?? '未知错误');
      }
    } finally {
      setTesting(false);
    }
  }, [apiKey, baseUrl, apiType]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: Colors.accent }]}>API 配置</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>配置你的 AI 模型接口</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>API 类型</Text>
          <View style={styles.apiTypeRow}>
            <TouchableOpacity
              style={[
                styles.apiTypeBtn,
                { backgroundColor: colors.cardBg, borderColor: apiType === 'openai' ? Colors.accent : colors.border },
                apiType === 'openai' && styles.apiTypeBtnActive,
              ]}
              onPress={() => handleApiTypeChange('openai')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={apiType === 'openai' ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={apiType === 'openai' ? Colors.accent : colors.textSecondary}
              />
              <Text style={[styles.apiTypeText, apiType === 'openai' && { color: Colors.accent }]}>
                OpenAI 兼容
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.apiTypeBtn,
                { backgroundColor: colors.cardBg, borderColor: apiType === 'minimax' ? Colors.accent : colors.border },
                apiType === 'minimax' && styles.apiTypeBtnActive,
              ]}
              onPress={() => handleApiTypeChange('minimax')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={apiType === 'minimax' ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={apiType === 'minimax' ? Colors.accent : colors.textSecondary}
              />
              <Text style={[styles.apiTypeText, apiType === 'minimax' && { color: Colors.accent }]}>
                MiniMax
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>API Key</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-xxxxxxxx"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </View>

        {apiType === 'openai' && (
          <>
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Base URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBg, borderColor: colors.border, color: colors.text }]}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.example.com/v1"
                placeholderTextColor={colors.textSecondary}
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
                <Text style={[styles.modelsLoadingText, { color: colors.textSecondary }]}>正在获取模型...</Text>
              </View>
            )}

            {models.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>选择模型</Text>
                <View style={styles.modelList}>
                  {models.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modelItem,
                        { backgroundColor: colors.cardBg, borderColor: selectedModel === m.id ? Colors.accent : colors.border },
                        selectedModel === m.id && styles.modelItemSelected,
                      ]}
                      onPress={() => setSelectedModel(m.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modelItemText,
                          { color: selectedModel === m.id ? Colors.accent : colors.text },
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
          </>
        )}

        {apiType === 'minimax' && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>选择模型</Text>
            <View style={styles.modelList}>
              {MINIMAX_MODELS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modelItem,
                    { backgroundColor: colors.cardBg, borderColor: selectedModel === m.id ? Colors.accent : colors.border },
                    selectedModel === m.id && styles.modelItemSelected,
                  ]}
                  onPress={() => setSelectedModel(m.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modelItemText,
                      { color: selectedModel === m.id ? Colors.accent : colors.text },
                      selectedModel === m.id && styles.modelItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {m.name}
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
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>保存配置</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, testing && styles.testButtonDisabled]}
          onPress={handleTestConnection}
          disabled={testing}
          activeOpacity={0.8}
        >
          {testing ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Text style={styles.testButtonText}>🔗 Test Connection</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.voiceSection, { borderTopColor: colors.border }]}>
          <View style={styles.voiceSectionRow}>
            <View style={styles.voiceSectionInfo}>
              <Text style={[styles.voiceSectionTitle, { color: colors.text }]}>语音反馈</Text>
              <Text style={[styles.voiceSectionDesc, { color: colors.textSecondary }]}>构图建议达标时播放语音提示</Text>
            </View>
            <TouchableOpacity
              style={[styles.voiceToggle, voiceEnabled && styles.voiceToggleActive]}
              onPress={async () => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                await saveAppSettings({ voiceEnabled: next });
                if (next) {
                  speak('语音反馈已开启');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={voiceEnabled ? 'volume-high' : 'volume-mute'}
                size={18}
                color={voiceEnabled ? Colors.accent : colors.textSecondary}
              />
              <Text style={[styles.voiceToggleText, voiceEnabled && styles.voiceToggleTextActive, { color: voiceEnabled ? Colors.accent : colors.textSecondary }]}>
                {voiceEnabled ? '开' : '关'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.themeSection, { borderTopColor: colors.border }]}>
          <View style={styles.themeSectionRow}>
            <View style={styles.themeSectionInfo}>
              <Text style={[styles.themeSectionTitle, { color: colors.text }]}>深色/浅色主题</Text>
              <Text style={[styles.themeSectionDesc, { color: colors.textSecondary }]}>切换应用外观主题</Text>
            </View>
            <TouchableOpacity
              style={[styles.themeToggle, theme === 'light' && styles.themeToggleLight]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={theme === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color={theme === 'dark' ? colors.accent : '#FFB800'}
              />
              <Text style={[styles.themeToggleText, theme === 'light' && styles.themeToggleTextLight, { color: theme === 'light' ? Colors.accent : colors.textSecondary }]}>
                {theme === 'dark' ? '深色' : '浅色'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.versionSection, { borderTopColor: colors.border }]}>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>当前版本</Text>
            <Text style={[styles.versionValue, { color: colors.text }]}>{getAppVersion()}</Text>
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
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  apiTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  apiTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
  apiTypeBtnActive: {
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  apiTypeText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 14,
  },
  modelList: {
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  modelItemSelected: {
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  modelItemText: {
    fontSize: 14,
    flex: 1,
  },
  modelItemTextSelected: {
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
    fontSize: 17,
    fontWeight: '700',
  },
  testButton: {
    backgroundColor: Colors.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  voiceSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  voiceSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceSectionInfo: {
    flex: 1,
  },
  voiceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  voiceSectionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  voiceToggleActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  voiceToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceToggleTextActive: {
    color: Colors.accent,
  },
  themeSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  themeSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeSectionInfo: {
    flex: 1,
  },
  themeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeSectionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  themeToggleLight: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(196,163,90,0.1)',
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeToggleTextLight: {
    color: Colors.accent,
  },
  versionSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    gap: 12,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  versionValue: {
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

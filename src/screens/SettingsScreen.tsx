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
import type { GridVariant, ImageQualityPreset } from '../types';

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
import { AccessibleToggle } from '../components/AccessibleToggle';

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
  const [defaultGridVariant, setDefaultGridVariant] = useState<GridVariant>('thirds');
  const [showHistogram, setShowHistogram] = useState(false);
  const [showLevel, setShowLevel] = useState(true);
  const [showFocusPeaking, setShowFocusPeaking] = useState(false);
  const [showSunPosition, setShowSunPosition] = useState(false);
  const [showFocusGuide, setShowFocusGuide] = useState(true);
  const [showBubbleChat, setShowBubbleChat] = useState(true);
  const [showShakeDetector, setShowShakeDetector] = useState(false);
  const [imageQualityPreset, setImageQualityPreset] = useState<ImageQualityPreset>('balanced');
  const [focusPeakingColor, setFocusPeakingColor] = useState('#FF4444');
  const [focusPeakingSensitivity, setFocusPeakingSensitivity] = useState<'low' | 'medium' | 'high'>('medium');

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
      setDefaultGridVariant(settings.defaultGridVariant);
      setShowHistogram(settings.showHistogram);
      setShowLevel(settings.showLevel);
      setShowFocusPeaking(settings.showFocusPeaking);
      setShowSunPosition(settings.showSunPosition);
      setShowFocusGuide(settings.showFocusGuide);
      setShowBubbleChat(settings.showBubbleChat ?? true);
      setShowShakeDetector(settings.showShakeDetector ?? false);
      setImageQualityPreset(settings.imageQualityPreset);
      setFocusPeakingColor(settings.focusPeakingColor ?? '#FF4444');
      setFocusPeakingSensitivity(settings.focusPeakingSensitivity ?? 'medium');
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
          <Text style={[styles.title, { color: colors.accent }]}>API 配置</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>配置你的 AI 模型接口</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>API 类型</Text>
          <View style={styles.apiTypeRow}>
            <TouchableOpacity
              style={[
                styles.apiTypeBtn,
                { backgroundColor: colors.cardBg, borderColor: apiType === 'openai' ? colors.accent : colors.border },
                apiType === 'openai' && styles.apiTypeBtnActive,
              ]}
              onPress={() => handleApiTypeChange('openai')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={apiType === 'openai' ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={apiType === 'openai' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.apiTypeText, { color: colors.textSecondary }, apiType === 'openai' && { color: colors.accent }]}>
                OpenAI 兼容
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.apiTypeBtn,
                { backgroundColor: colors.cardBg, borderColor: apiType === 'minimax' ? colors.accent : colors.border },
                apiType === 'minimax' && styles.apiTypeBtnActive,
              ]}
              onPress={() => handleApiTypeChange('minimax')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={apiType === 'minimax' ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={apiType === 'minimax' ? colors.accent : colors.textSecondary}
              />
              <Text style={[styles.apiTypeText, { color: colors.textSecondary }, apiType === 'minimax' && { color: colors.accent }]}>
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
              style={[styles.fetchBtn, { backgroundColor: colors.cardBg, borderColor: colors.accent }, fetching && styles.fetchBtnDisabled]}
              onPress={handleFetchModels}
              disabled={fetching}
              activeOpacity={0.8}
            >
              {fetching ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
                  <Text style={[styles.fetchBtnText, { color: colors.accent }]}>获取模型列表</Text>
                </>
              )}
            </TouchableOpacity>

            {loadingModels && (
              <View style={styles.modelsLoading}>
                <ActivityIndicator color={colors.accent} />
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
                        { backgroundColor: colors.cardBg, borderColor: selectedModel === m.id ? colors.accent : colors.border },
                        selectedModel === m.id && styles.modelItemSelected,
                      ]}
                      onPress={() => setSelectedModel(m.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modelItemText,
                          { color: selectedModel === m.id ? colors.accent : colors.text },
                          selectedModel === m.id && styles.modelItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {m.name || m.id}
                      </Text>
                      {selectedModel === m.id && (
                        <Ionicons name="checkmark" size={16} color={colors.accent} />
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
                    { backgroundColor: colors.cardBg, borderColor: selectedModel === m.id ? colors.accent : colors.border },
                    selectedModel === m.id && styles.modelItemSelected,
                  ]}
                  onPress={() => setSelectedModel(m.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modelItemText,
                      { color: selectedModel === m.id ? colors.accent : colors.text },
                      selectedModel === m.id && styles.modelItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {m.name}
                  </Text>
                  {selectedModel === m.id && (
                    <Ionicons name="checkmark" size={16} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent }, saving && styles.saveBtnDisabled]}
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
          style={[styles.testButton, { backgroundColor: colors.cardBg, borderColor: colors.accent }, testing && styles.testButtonDisabled]}
          onPress={handleTestConnection}
          disabled={testing}
          activeOpacity={0.8}
        >
          {testing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={[styles.testButtonText, { color: colors.accent }]}>🔗 Test Connection</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.voiceSection, { borderTopColor: colors.border }]}>
          <View style={styles.voiceSectionRow}>
            <View style={styles.voiceSectionInfo}>
              <Text style={[styles.voiceSectionTitle, { color: colors.text }]}>语音反馈</Text>
              <Text style={[styles.voiceSectionDesc, { color: colors.textSecondary }]}>构图建议达标时播放语音提示</Text>
            </View>
            <AccessibleToggle
              label="语音反馈"
              hint={voiceEnabled ? '关闭语音反馈' : '打开语音反馈'}
              toggled={voiceEnabled}
              onPress={async () => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                await saveAppSettings({ voiceEnabled: next });
                if (next) {
                  speak('语音反馈已开启');
                }
              }}
            />
          </View>
        </View>

        <View style={[styles.themeSection, { borderTopColor: colors.border }]}>
          <View style={styles.themeSectionRow}>
            <View style={styles.themeSectionInfo}>
              <Text style={[styles.themeSectionTitle, { color: colors.text }]}>深色/浅色主题</Text>
              <Text style={[styles.themeSectionDesc, { color: colors.textSecondary }]}>切换应用外观主题</Text>
            </View>
            <AccessibleToggle
              label="深色/浅色主题"
              hint="切换应用外观主题"
              toggled={theme === 'light'}
              onPress={toggleTheme}
            />
          </View>
        </View>

        <View style={[styles.cameraPrefsSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>相机偏好</Text>

          {/* Default Grid */}
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>默认网格</Text>
              <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>相机启动时的默认网格样式</Text>
            </View>
            <View style={styles.gridSelectorRow}>
              {(['thirds', 'golden', 'diagonal', 'spiral'] as GridVariant[]).map((v) => {
                const labels: Record<GridVariant, string> = { thirds: '三分', golden: '黄金', diagonal: '对角', spiral: '螺旋', none: '关' };
                const isSelected = defaultGridVariant === v;
                const gridLabel = `${labels[v]}网格${isSelected ? '，已选中' : ''}`;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.gridOption,
                      { backgroundColor: colors.cardBg, borderColor: isSelected ? colors.accent : colors.border },
                      isSelected && { backgroundColor: 'rgba(232,213,183,0.1)', borderColor: colors.accent },
                    ]}
                    onPress={async () => {
                      setDefaultGridVariant(v);
                      await saveAppSettings({ defaultGridVariant: v });
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={gridLabel}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityHint={isSelected ? '取消选择此网格类型' : '选择此网格类型为默认'}
                  >
                    <Text style={[styles.gridOptionText, { color: defaultGridVariant === v ? colors.accent : colors.textSecondary }]}>
                      {labels[v]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Toggles */}
          {[
            { label: '直方图', desc: '显示实时直方图', state: showHistogram, setter: setShowHistogram, saveKey: 'showHistogram' },
            { label: '水平仪', desc: '显示相机水平状态', state: showLevel, setter: setShowLevel, saveKey: 'showLevel' },
            { label: '对焦峰值', desc: '高亮显示对焦边缘', state: showFocusPeaking, setter: setShowFocusPeaking, saveKey: 'showFocusPeaking' },
            { label: '太阳位置', desc: '显示太阳方向与黄金时段', state: showSunPosition, setter: setShowSunPosition, saveKey: 'showSunPosition' },
            { label: '对焦辅助', desc: '显示对焦引导框', state: showFocusGuide, setter: setShowFocusGuide, saveKey: 'showFocusGuide' },
            { label: 'AI 建议气泡', desc: '显示 AI 构图建议气泡', state: showBubbleChat, setter: setShowBubbleChat, saveKey: 'showBubbleChat' },
            { label: '摇一摇关闭建议', desc: '摇动设备关闭所有 AI 建议气泡', state: showShakeDetector, setter: setShowShakeDetector, saveKey: 'showShakeDetector' },
          ].map(({ label, desc, state, setter, saveKey }) => (
            <View key={saveKey} style={[styles.toggleRow, { borderTopColor: colors.border }]}>
              <View style={styles.prefInfo}>
                <Text style={[styles.prefTitle, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>{desc}</Text>
              </View>
              <AccessibleToggle
                label={label}
                hint={state ? `关闭${label}` : `打开${label}`}
                toggled={state}
                onPress={async () => {
                  const next = !state;
                  setter(next);
                  await saveAppSettings({ [saveKey]: next });
                }}
              />
            </View>
          ))}

          {/* Image Quality Preset */}
          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <View style={styles.prefInfo}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>图片质量</Text>
              <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>保存照片的分辨率与压缩质量</Text>
            </View>
          </View>
          <View style={styles.qualityPresetRow}>
            {(['size', 'balanced', 'quality'] as ImageQualityPreset[]).map((p) => {
              const labels: Record<ImageQualityPreset, string> = { size: '省空间', balanced: '均衡', quality: '高质量' };
              const isSelected = imageQualityPreset === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.qualityOption,
                    { backgroundColor: colors.cardBg, borderColor: imageQualityPreset === p ? colors.accent : colors.border },
                    imageQualityPreset === p && { backgroundColor: 'rgba(232,213,183,0.1)', borderColor: colors.accent },
                  ]}
                  onPress={async () => {
                    setImageQualityPreset(p);
                    await saveAppSettings({ imageQualityPreset: p });
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`${labels[p]}${isSelected ? '，已选中' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint={isSelected ? '当前图片质量设置' : `切换到${labels[p]}`}
                >
                  <Text style={[styles.qualityOptionText, { color: isSelected ? colors.accent : colors.textSecondary }]}>
                    {labels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Focus Peaking Sensitivity */}
          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <View style={styles.prefInfo}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>对焦峰值灵敏度</Text>
              <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>低=少边缘，高=多边缘</Text>
            </View>
          </View>
          <View style={styles.sensitivityRow}>
            {(['low', 'medium', 'high'] as const).map((s) => {
              const labels: Record<string, string> = { low: '低', medium: '中', high: '高' };
              const isSelected = focusPeakingSensitivity === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sensitivityOption,
                    { backgroundColor: colors.cardBg, borderColor: isSelected ? colors.accent : colors.border },
                    isSelected && styles.sensitivityOptionSelected,
                  ]}
                  onPress={async () => {
                    setFocusPeakingSensitivity(s);
                    await saveAppSettings({ focusPeakingSensitivity: s });
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`灵敏度 ${labels[s]}${isSelected ? '，已选中' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.sensitivityOptionText, { color: isSelected ? colors.accent : colors.textSecondary }]}>
                    {labels[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Focus Peaking Color */}
          <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
            <View style={styles.prefInfo}>
              <Text style={[styles.prefTitle, { color: colors.text }]}>对焦峰值颜色</Text>
              <Text style={[styles.prefDesc, { color: colors.textSecondary }]}>对焦边缘高亮颜色</Text>
            </View>
          </View>
          <View style={styles.colorSwatchRow}>
            {(['#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FFFFFF'] as string[]).map((c) => {
              const isSelected = focusPeakingColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c, borderColor: isSelected ? colors.accent : colors.border },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                  onPress={async () => {
                    setFocusPeakingColor(c);
                    await saveAppSettings({ focusPeakingColor: c });
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`颜色 ${c}${isSelected ? '，已选中' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                />
              );
            })}
          </View>
        </View>

        <View style={[styles.versionSection, { borderTopColor: colors.border }]}>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: colors.textSecondary }]}>当前版本</Text>
            <Text style={[styles.versionValue, { color: colors.text }]}>{getAppVersion()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.updateBtn, { backgroundColor: colors.cardBg, borderColor: colors.accent }, checkingUpdate && styles.updateBtnDisabled]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            activeOpacity={0.8}
          >
            {checkingUpdate ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={colors.accent} />
                <Text style={[styles.updateBtnText, { color: colors.accent }]}>检查更新</Text>
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
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 16,
  },
  fetchBtnDisabled: {
    opacity: 0.6,
  },
  fetchBtnText: {
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 14,
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  voiceToggleActive: {
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  voiceToggleText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  themeToggleLight: {
    backgroundColor: 'rgba(196,163,90,0.1)',
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
cameraPrefsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  prefInfo: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  prefDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  gridSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gridOption: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gridOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  toggle: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  qualityPresetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  qualityOption: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  qualityOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorSwatchRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    paddingLeft: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  colorSwatchSelected: {
    borderWidth: 3,
  },
  sensitivityRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingLeft: 4,
  },
  sensitivityOption: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sensitivityOptionSelected: {
    backgroundColor: 'rgba(232,213,183,0.1)',
  },
  sensitivityOptionText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

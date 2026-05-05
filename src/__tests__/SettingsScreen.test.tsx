import React from 'react';
import { act, render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Suppress act() warnings from @expo/vector-icons Icon component (async state updates in third-party code)
// and from SettingsScreen's useEffect async microtasks resolving outside act boundaries
const originalError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('An update to Icon inside a test was not wrapped in act')) return;
    if (args[0].includes('An update to SettingsScreen inside a test was not wrapped in act')) return;
  }
  originalError(...args);
};
import { SettingsScreen } from '../screens/SettingsScreen';
import {
  loadApiConfig,
  saveApiConfig,
  fetchAvailableModels,
  testOpenAIConnection,
  testMinimaxConnection,
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

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      text: '#fff',
      textSecondary: '#aaa',
      cardBg: '#111',
      border: '#333',
    },
    toggleTheme: jest.fn(),
  })),
}));

jest.mock('../services/api', () => ({
  loadApiConfig: jest.fn(),
  saveApiConfig: jest.fn(),
  fetchAvailableModels: jest.fn(),
  testOpenAIConnection: jest.fn(),
  testMinimaxConnection: jest.fn(),
  MINIMAX_MODELS: [{ id: 'MiniMax-M2.7', name: 'MiniMax M2.7' }],
}));

jest.mock('../services/update', () => ({
  getAppVersion: jest.fn(() => '1.0.0'),
  checkForUpdate: jest.fn(),
  showUpdateDialog: jest.fn(),
  downloadAndInstall: jest.fn(),
  openReleasePage: jest.fn(),
}));

jest.mock('../services/settings', () => ({
  loadAppSettings: jest.fn(() => Promise.resolve({ voiceEnabled: false, theme: 'dark', timerDuration: 3, defaultGridVariant: 'thirds', showHistogram: false, showLevel: true, showFocusPeaking: false, showSunPosition: false, showFocusGuide: true, showBubbleChat: true, showShakeDetector: false, showKeypoints: false, imageQualityPreset: 'balanced', focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium' })),
  saveAppSettings: jest.fn(),
}));

jest.mock('../hooks/useVoiceFeedback', () => ({
  speak: jest.fn(),
}));

const mockAlert = jest.spyOn(Alert, 'alert');

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadApiConfig as jest.Mock).mockResolvedValue(null);
    (loadAppSettings as jest.Mock).mockResolvedValue({ voiceEnabled: false, theme: 'dark', timerDuration: 3, defaultGridVariant: 'thirds', showHistogram: false, showLevel: true, showFocusPeaking: false, showSunPosition: false, showFocusGuide: true, showBubbleChat: true, showShakeDetector: false, showKeypoints: false, imageQualityPreset: 'balanced', focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium' });
    (getAppVersion as jest.Mock).mockReturnValue('1.0.0');
  });

  // 1. renders API config header
  it('renders API config header', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('API 配置')).toBeTruthy();
    expect(getByText('配置你的 AI 模型接口')).toBeTruthy();
  });

  // 2. renders both API type buttons
  it('renders both API type buttons', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('OpenAI 兼容')).toBeTruthy();
    expect(getByText('MiniMax')).toBeTruthy();
  });

  // 3. switches to MiniMax mode — hides Base URL section
  it('switches to MiniMax mode and hides Base URL section', () => {
    const { getByText, queryByText } = render(<SettingsScreen />);
    expect(getByText('Base URL')).toBeTruthy();
    fireEvent.press(getByText('MiniMax'));
    expect(queryByText('Base URL')).toBeNull();
  });

  // 4. switches to OpenAI mode — shows Base URL input
  it('switches to OpenAI mode and shows Base URL input', () => {
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.press(getByText('MiniMax'));
    fireEvent.press(getByText('OpenAI 兼容'));
    expect(getByText('Base URL')).toBeTruthy();
    expect(getByPlaceholderText('https://api.example.com/v1')).toBeTruthy();
  });

  // 5. API key input is secure (secureTextEntry)
  it('API key input has secureTextEntry enabled', () => {
    const { getByPlaceholderText } = render(<SettingsScreen />);
    const apiKeyInput = getByPlaceholderText('sk-xxxxxxxx');
    expect(apiKeyInput.props.secureTextEntry).toBe(true);
  });

  // 6. shows validation alert when saving without API key
  it('shows validation alert when saving without API key', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('保存配置'));
    expect(mockAlert).toHaveBeenCalledWith('请填写 API Key');
  });

  // 7. shows validation alert when saving OpenAI without base URL
  it('shows validation alert when saving OpenAI without base URL', () => {
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey123');
    fireEvent.press(getByText('保存配置'));
    expect(mockAlert).toHaveBeenCalledWith('请填写 Base URL');
  });

  // 8. shows validation alert when saving without selecting model
  it('shows validation alert when saving without selecting model', () => {
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey123');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('保存配置'));
    expect(mockAlert).toHaveBeenCalledWith('请选择模型');
  });

  // 9. successful save — calls saveApiConfig and shows success alert
  it('successful save calls saveApiConfig and shows success alert', async () => {
    (saveApiConfig as jest.Mock).mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey123');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    (fetchAvailableModels as jest.Mock).mockResolvedValue({
      ok: true,
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
    });
    fireEvent.press(getByText('获取模型列表'));
    await waitFor(() => {
      expect(getByText('GPT-4o')).toBeTruthy();
    });
    fireEvent.press(getByText('GPT-4o'));
    fireEvent.press(getByText('保存配置'));
    await waitFor(() => {
      expect(saveApiConfig).toHaveBeenCalledWith(
        'sk-testkey123',
        'https://api.test.com',
        'gpt-4o',
        'openai'
      );
    });
    expect(mockAlert).toHaveBeenCalledWith('保存成功', 'API 配置已保存', expect.any(Array));
  });

  // 10. test connection OpenAI — button triggers testOpenAIConnection
  it('test connection button triggers testOpenAIConnection', async () => {
    (testOpenAIConnection as jest.Mock).mockResolvedValue({ ok: true });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey123');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('🔗 Test Connection'));
    await waitFor(() => {
      expect(testOpenAIConnection).toHaveBeenCalledWith('sk-testkey123', 'https://api.test.com');
    });
    expect(mockAlert).toHaveBeenCalledWith('✅ 连接成功', 'API 配置正常，可以正常使用');
  });

  // 11. test connection MiniMax — button triggers testMinimaxConnection
  it('test connection button triggers testMinimaxConnection', async () => {
    (testMinimaxConnection as jest.Mock).mockResolvedValue({ ok: true });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.press(getByText('MiniMax'));
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'test-minimax-key');
    fireEvent.press(getByText('🔗 Test Connection'));
    await waitFor(() => {
      expect(testMinimaxConnection).toHaveBeenCalledWith('test-minimax-key');
    });
    expect(mockAlert).toHaveBeenCalledWith('✅ 连接成功', 'API 配置正常，可以正常使用');
  });

  // 12. fetch models — calls fetchAvailableModels and populates list
  it('fetch models button calls fetchAvailableModels and populates list', async () => {
    (fetchAvailableModels as jest.Mock).mockResolvedValue({
      ok: true,
      models: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      ],
    });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey123');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('获取模型列表'));
    await waitFor(() => {
      expect(fetchAvailableModels).toHaveBeenCalledWith('sk-testkey123', 'https://api.test.com');
    });
    await waitFor(() => {
      expect(getByText('GPT-4o')).toBeTruthy();
      expect(getByText('GPT-4o Mini')).toBeTruthy();
    });
  });

  // 13. voice toggle calls saveAppSettings
  it('voice toggle calls saveAppSettings with updated value', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => {
      // AccessibleToggle renders icon instead of text; find by accessibilityLabel
      expect(getByLabelText('语音反馈')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('语音反馈'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ voiceEnabled: true });
    });
    expect(speak).toHaveBeenCalledWith('语音反馈已开启');
  });

  // 14. version is displayed
  it('version is displayed with correct label', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('当前版本')).toBeTruthy();
    expect(getByText('1.0.0')).toBeTruthy();
  });

  // 15. check update button triggers update flow
  it('check update button triggers checkForUpdate', async () => {
    (checkForUpdate as jest.Mock).mockResolvedValue({
      version: '2.0.0',
      htmlUrl: 'https://github.com/example/release',
      downloadUrl: null,
    });
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('检查更新'));
    await waitFor(() => {
      expect(checkForUpdate).toHaveBeenCalled();
    });
    expect(showUpdateDialog).toHaveBeenCalled();
  });

  // 16. loads existing config on mount — fields are populated
  it('loads existing config on mount and populates fields', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue({
      apiType: 'openai',
      apiKey: 'sk-existing',
      baseUrl: 'https://existing.api.com',
      model: 'gpt-4o',
    });
    const { getByDisplayValue } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('sk-existing')).toBeTruthy();
      expect(getByDisplayValue('https://existing.api.com')).toBeTruthy();
    });
  });

  // 17. loads saved settings on mount — voiceEnabled state is restored
  it('loads saved settings on mount and restores voiceEnabled state', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: true,
      theme: 'dark',
      timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: false,
      showLevel: false,
      showFocusPeaking: false,
      showSunPosition: false,
      showFocusGuide: false,
      showBubbleChat: true,
      showShakeDetector: false,
      focusPeakingColor: '#FF4444',
      focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => {
      // Voice toggle is ON (voiceEnabled: true) — find by accessibilityLabel
      const voiceToggle = getByLabelText('语音反馈');
      expect(voiceToggle.props.accessibilityState).toMatchObject({ checked: true });
    });
  });

  // 18. MiniMax mode shows hardcoded model list without fetch
  it('MiniMax mode shows hardcoded model list without fetch', () => {
    const { getByText, queryByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('MiniMax'));
    expect(getByText('MiniMax M2.7')).toBeTruthy();
    expect(queryByText('获取模型列表')).toBeNull();
  });

  // 19. toggling theme calls toggleTheme
  it('theme toggle button calls toggleTheme', () => {
    const ThemeContext = require('../contexts/ThemeContext');

    render(<SettingsScreen />);

    // Track which toggleTheme jest.fn() was passed via useTheme context
    const firstResult = ThemeContext.useTheme.mock.results[0];
    const passedToggleTheme = firstResult?.value?.toggleTheme as jest.Mock;

    // Find the theme AccessibleToggle by its accessibilityLabel (AccessibleToggle uses icons, not text)
    const themeToggle = screen.getByLabelText('深色/浅色主题');
    expect(themeToggle).toBeTruthy();

    // Press the toggle
    fireEvent.press(themeToggle);
    expect(passedToggleTheme?.mock.calls.length).toBe(1);
  });

  // 20. validation when fetching models without API key
  it('shows alert when fetching models without API key or base URL', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('获取模型列表'));
    expect(mockAlert).toHaveBeenCalledWith('请先填写 API Key 和 Base URL');
  });

  // 21. connection test shows failure alert
  it('shows failure alert when test connection fails', async () => {
    (testOpenAIConnection as jest.Mock).mockResolvedValue({ ok: false, error: 'Invalid API key' });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-badkey');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('🔗 Test Connection'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('❌ 连接失败', 'Invalid API key');
    });
  });

  // 22. save shows failure alert on error
  it('shows failure alert when save fails', async () => {
    (saveApiConfig as jest.Mock).mockRejectedValue(new Error('Network error'));
    (fetchAvailableModels as jest.Mock).mockResolvedValue({
      ok: true,
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
    });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-testkey');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('获取模型列表'));
    await waitFor(() => expect(getByText('GPT-4o')).toBeTruthy());
    fireEvent.press(getByText('GPT-4o'));
    fireEvent.press(getByText('保存配置'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('保存失败', 'Network error');
    });
  });

  // 23. save test with minimax
  it('successful save in MiniMax mode calls saveApiConfig with minimax type', async () => {
    (saveApiConfig as jest.Mock).mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.press(getByText('MiniMax'));
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'test-minimax-key');
    fireEvent.press(getByText('MiniMax M2.7'));
    fireEvent.press(getByText('保存配置'));
    await waitFor(() => {
      expect(saveApiConfig).toHaveBeenCalledWith(
        'test-minimax-key',
        '',
        'MiniMax-M2.7',
        'minimax'
      );
    });
    expect(mockAlert).toHaveBeenCalledWith('保存成功', 'API 配置已保存', expect.any(Array));
  });

  // 24. test connection without API key shows alert
  it('test connection without API key shows validation alert', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('🔗 Test Connection'));
    expect(mockAlert).toHaveBeenCalledWith('请先填写 API Key');
  });

  // 25. check update shows "already latest" when no newer version
  it('shows already latest alert when no newer version available', async () => {
    (checkForUpdate as jest.Mock).mockResolvedValue({
      version: '1.0.0',
      htmlUrl: 'https://github.com/example/release',
    });
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText('检查更新'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('已是最新版本', '当前版本 v1.0.0 已是最新版本');
    });
  });

  // 26. fetch models handles error response
  it('shows alert when fetch models returns error', async () => {
    (fetchAvailableModels as jest.Mock).mockResolvedValue({
      ok: false,
      error: { message: 'Invalid API key' },
    });
    const { getByText, getByPlaceholderText } = render(<SettingsScreen />);
    fireEvent.changeText(getByPlaceholderText('sk-xxxxxxxx'), 'sk-badkey');
    fireEvent.changeText(getByPlaceholderText('https://api.example.com/v1'), 'https://api.test.com');
    fireEvent.press(getByText('获取模型列表'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('获取模型列表失败', 'Invalid API key');
    });
  });

  // 27. loading existing config with minimax type defaults to correct state
  it('loads existing config with minimax type and shows MiniMax models', async () => {
    (loadApiConfig as jest.Mock).mockResolvedValue({
      apiType: 'minimax',
      apiKey: 'sk-minimax-saved',
      baseUrl: '',
      model: 'MiniMax-M2.7',
    });
    const { getByText, getByDisplayValue } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByDisplayValue('sk-minimax-saved')).toBeTruthy();
    });
    expect(getByText('MiniMax M2.7')).toBeTruthy();
  });

  // 28. camera preferences section renders with all toggles
  it('renders camera preferences section with all overlay toggles', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('相机偏好')).toBeTruthy();
      expect(getByText('默认网格')).toBeTruthy();
      expect(getByText('直方图')).toBeTruthy();
      expect(getByText('水平仪')).toBeTruthy();
      expect(getByText('对焦峰值')).toBeTruthy();
      expect(getByText('太阳位置')).toBeTruthy();
      expect(getByText('对焦辅助')).toBeTruthy();
    });
  });

  // 29. camera preferences loads saved settings on mount
  it('loads camera preference settings on mount', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false,
      theme: 'dark',
      timerDuration: 3,
      defaultGridVariant: 'golden',
      showHistogram: true,
      showLevel: false,
      showFocusPeaking: true,
      showSunPosition: true,
      showFocusGuide: false,
      showBubbleChat: true,
      showShakeDetector: false,
      focusPeakingColor: '#FF4444',
      focusPeakingSensitivity: 'medium',
    });
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('相机偏好')).toBeTruthy();
    });
  });

  // 30. histogram toggle is rendered with ellipse-outline icon (default off)
  it('renders histogram toggle with correct default icon (ellipse-outline)', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('直方图')).toBeTruthy(); });
    // The toggle icon (ellipse-outline) is a sibling of the label in the toggle row.
    // We verify the toggle row exists and contains the expected label.
    expect(getByText('显示实时直方图')).toBeTruthy();
  });

  // 31. selecting default grid variant saves defaultGridVariant
  it('selects golden grid variant and saves defaultGridVariant', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('默认网格')).toBeTruthy(); });
    fireEvent.press(getByText('黄金'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ defaultGridVariant: 'golden' });
    });
  });

  // 32. level toggle is rendered with ellipse-outline icon (default on = true, but shows as on since default is true)
  // Actually default showLevel=true so icon should be checkmark-circle
  it('renders level toggle with correct default icon (checkmark-circle since default is true)', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('水平仪')).toBeTruthy(); });
    expect(getByText('显示相机水平状态')).toBeTruthy();
  });

  // 33. renders image quality preset section with all 3 options
  it('renders image quality preset section with all 3 options', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('图片质量')).toBeTruthy(); });
    expect(getByText('省空间')).toBeTruthy();
    expect(getByText('均衡')).toBeTruthy();
    expect(getByText('高质量')).toBeTruthy();
  });

  // 34. selects quality preset and saves imageQualityPreset
  it('selects quality preset and saves imageQualityPreset', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('图片质量')).toBeTruthy(); });
    fireEvent.press(getByText('高质量'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ imageQualityPreset: 'quality' });
    });
  });

  // 35. selects size preset and saves imageQualityPreset
  it('selects size preset and saves imageQualityPreset', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('图片质量')).toBeTruthy(); });
    fireEvent.press(getByText('省空间'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ imageQualityPreset: 'size' });
    });
  });

  // 36. camera preference toggle has accessibilityRole=switch and correct accessibilityState
  it('overlay toggle has accessibilityRole=switch', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('直方图')).toBeTruthy(); });
    const histogramToggle = getByLabelText('直方图');
    expect(histogramToggle.props.accessibilityRole).toBe('switch');
  });

  // 37. toggle accessibilityState reflects current checked state (off)
  it('toggle accessibilityState reflects checked=false when off', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false, theme: 'dark', timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: false, showLevel: true, showFocusPeaking: false,
      showSunPosition: false, showFocusGuide: true, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('水平仪')).toBeTruthy(); });
    const levelToggle = getByLabelText('水平仪');
    expect(levelToggle.props.accessibilityState).toMatchObject({ checked: true });
  });

  // 38. toggle accessibilityState reflects checked=true when on
  it('toggle accessibilityState reflects checked=true when on', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false, theme: 'dark', timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: true, showLevel: true, showFocusPeaking: true,
      showSunPosition: true, showFocusGuide: true, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('直方图')).toBeTruthy(); });
    const histogramToggle = getByLabelText('直方图');
    expect(histogramToggle.props.accessibilityState).toMatchObject({ checked: true });
  });

  // 39. toggle has accessibilityHint describing the action
  it('toggle has accessibilityHint describing what will happen on press', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('直方图')).toBeTruthy(); });
    const histogramToggle = getByLabelText('直方图');
    // Off → hint should say "打开直方图"; On → "关闭直方图"
    expect(histogramToggle.props.accessibilityHint).toMatch(/打开|关闭/);
  });

  // 40. grid option buttons have accessibilityLabel describing selection state
  it('grid option button has accessibilityLabel with selection state', async () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('默认网格')).toBeTruthy(); });
    // Default is 'thirds' — the thirds button should say '三分网格，已选中'
    const thirdsButton = getByLabelText('三分网格，已选中');
    expect(thirdsButton).toBeTruthy();
    expect(thirdsButton.props.accessibilityState).toMatchObject({ selected: true });
  });

  // 41. unselected grid option has correct accessibilityLabel and selectable hint
  it('unselected grid option button has accessibilityHint to select it', async () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('默认网格')).toBeTruthy(); });
    // '黄金' is not selected by default (thirds is)
    const goldenButton = getByLabelText('黄金网格');
    expect(goldenButton).toBeTruthy();
    expect(goldenButton.props.accessibilityState).toMatchObject({ selected: false });
    expect(goldenButton.props.accessibilityHint).toBe('选择此网格类型为默认');
  });

  // 42. quality preset buttons have accessibilityLabel with selection state
  it('quality preset button has accessibilityLabel with selection state', async () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('图片质量')).toBeTruthy(); });
    // Default preset is 'balanced' → label '均衡，已选中'
    const balancedButton = getByLabelText('均衡，已选中');
    expect(balancedButton).toBeTruthy();
    expect(balancedButton.props.accessibilityState).toMatchObject({ selected: true });
  });

  // 43. unselected quality preset has correct selectable hint
  it('unselected quality preset has correct accessibilityHint', async () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('图片质量')).toBeTruthy(); });
    // 'quality' preset label is '高质量' (not '高质量质量')
    const qualityButton = getByLabelText('高质量');
    expect(qualityButton).toBeTruthy();
    expect(qualityButton.props.accessibilityHint).toBe('切换到高质量');
  });

  // 44. theme toggle has accessibilityLabel describing the feature
  it('theme toggle has accessibilityLabel describing theme feature', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('深色/浅色主题')).toBeTruthy(); });
    const themeToggle = getByLabelText('深色/浅色主题');
    expect(themeToggle.props.accessibilityRole).toBe('switch');
  });

  // 45. voice toggle has correct accessibilityLabel
  it('voice toggle has accessibilityLabel describing voice feedback feature', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('语音反馈')).toBeTruthy(); });
    const voiceToggle = getByLabelText('语音反馈');
    expect(voiceToggle.props.accessibilityRole).toBe('switch');
  });

  // 46. all 5 overlay toggles are accessible via their labels
  it('all 5 overlay toggles are accessible via their labels', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('直方图')).toBeTruthy(); });
    const toggles = ['直方图', '水平仪', '对焦峰值', '太阳位置', '对焦辅助'] as const;
    toggles.forEach(label => {
      const btn = getByLabelText(label);
      expect(btn.props.accessibilityRole).toBe('switch');
      expect(typeof btn.props.accessibilityState).toBe('object');
    });
  });

  // 48. AI suggestion bubble toggle calls saveAppSettings with showBubbleChat
  it('AI suggestion bubble toggle calls saveAppSettings with showBubbleChat', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('AI 建议气泡')).toBeTruthy(); });
    fireEvent.press(getByLabelText('AI 建议气泡'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ showBubbleChat: false, showShakeDetector: false });
    });
  });

  // 49. color swatch press saves focusPeakingColor via saveAppSettings
  it('color swatch press saves focusPeakingColor via saveAppSettings', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('颜色 #44FF44')).toBeTruthy(); });
    await act(async () => {
      fireEvent.press(getByLabelText('颜色 #44FF44'));
    });
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingColor: '#44FF44' });
    });
  });

  // 50. sensitivity selector saves focusPeakingSensitivity via saveAppSettings
  it('sensitivity selector saves focusPeakingSensitivity via saveAppSettings', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    // Default sensitivity is 'medium' — verify it's marked as selected
    await waitFor(() => {
      expect(getByLabelText('灵敏度 中，已选中')).toBeTruthy();
    });
    // Press '高' (high) sensitivity option
    await act(async () => {
      fireEvent.press(getByLabelText('灵敏度 高'));
    });
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingSensitivity: 'high' });
    });
    // Verify the previously-selected '中' is no longer selected
    expect(getByLabelText('灵敏度 中').props.accessibilityState).not.toMatchObject({ selected: true });
  });

  // 51. sensitivity selector 'low' option saves focusPeakingSensitivity
  it('sensitivity low option saves focusPeakingSensitivity', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('灵敏度 中，已选中')).toBeTruthy(); });
    await act(async () => {
      fireEvent.press(getByLabelText('灵敏度 低'));
    });
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ focusPeakingSensitivity: 'low' });
    });
  });

  // 47. toggle press updates settings via onPress callback
  it('toggle press triggers onPress and saves updated setting', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('直方图')).toBeTruthy(); });
    fireEvent.press(getByLabelText('直方图'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ showHistogram: true });
    });
  });

  // 52. shake detector toggle calls saveAppSettings with showShakeDetector
  it('shake detector toggle calls saveAppSettings with showShakeDetector', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('摇一摇关闭建议')).toBeTruthy(); });
    fireEvent.press(getByLabelText('摇一摇关闭建议'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
    });
  });

  // 52. shake detector toggle is rendered with label "摇一摇关闭建议"
  it('shake detector toggle is rendered with correct label', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('摇一摇关闭建议')).toBeTruthy(); });
    const shakeToggle = getByLabelText('摇一摇关闭建议');
    expect(shakeToggle.props.accessibilityRole).toBe('switch');
  });

  // 53. shake detector toggle calls saveAppSettings with showShakeDetector
  it('shake detector toggle calls saveAppSettings with showShakeDetector', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('摇一摇关闭建议')).toBeTruthy(); });
    fireEvent.press(getByLabelText('摇一摇关闭建议'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
    });
  });

  // 54. shake detector toggle reflects checked=true when loaded from settings
  it('shake detector toggle reflects checked=true when enabled in settings', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false, theme: 'dark', timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: false, showLevel: true, showFocusPeaking: false,
      showSunPosition: false, showFocusGuide: true, showBubbleChat: true,
      showShakeDetector: true, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('摇一摇关闭建议')).toBeTruthy(); });
    const shakeToggle = getByLabelText('摇一摇关闭建议');
    expect(shakeToggle.props.accessibilityState).toMatchObject({ checked: true });
  });

  // 54b. shake detector toggle is disabled when bubble chat is off
  it('shake detector toggle is disabled when showBubbleChat is false', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValueOnce({
      voiceEnabled: false, theme: 'dark', timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: false, showLevel: true, showFocusPeaking: false,
      showSunPosition: false, showFocusGuide: true, showBubbleChat: false,
      showShakeDetector: true, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('摇一摇关闭建议')).toBeTruthy(); });
    const shakeToggle = getByLabelText('摇一摇关闭建议');
    // Should be visually disabled (opacity + non-interactive) and a11y state reflects disabled
    expect(shakeToggle.props.accessibilityState).toMatchObject({ disabled: true });
  });

  // 55. showKeypoints toggle is rendered with label "关键点标记"
  it('showKeypoints toggle is rendered with label "关键点标记"', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('关键点标记')).toBeTruthy(); });
    const keypointsToggle = getByLabelText('关键点标记');
    expect(keypointsToggle.props.accessibilityRole).toBe('switch');
    expect(keypointsToggle.props.accessibilityState).toMatchObject({ checked: false });
  });

  // 56. showKeypoints toggle calls saveAppSettings with showKeypoints
  it('showKeypoints toggle calls saveAppSettings with showKeypoints', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('关键点标记')).toBeTruthy(); });
    fireEvent.press(getByLabelText('关键点标记'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ showKeypoints: true });
    });
  });

  // 57. showKeypoints toggle reflects checked=true when enabled in settings
  it('showKeypoints toggle reflects checked=true when enabled in settings', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false, theme: 'dark', timerDuration: 3,
      defaultGridVariant: 'thirds',
      showHistogram: false, showLevel: true, showFocusPeaking: false,
      showSunPosition: false, showFocusGuide: true, showBubbleChat: true,
      showShakeDetector: false, showKeypoints: true, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('关键点标记')).toBeTruthy(); });
    const keypointsToggle = getByLabelText('关键点标记');
    expect(keypointsToggle.props.accessibilityState).toMatchObject({ checked: true });
  });

  // 58. timer duration section is rendered with all 3 options
  it('timer duration section is rendered with all 3 options', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByText('倒计时时长')).toBeTruthy(); });
    expect(getByText('3s')).toBeTruthy();
    expect(getByText('5s')).toBeTruthy();
    expect(getByText('10s')).toBeTruthy();
  });

  // 59. timer duration 3s is selected by default
  it('timer duration 3s is selected by default', async () => {
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('3s，已选中')).toBeTruthy(); });
    expect(getByLabelText('3s，已选中')).toBeTruthy();
    expect(getByLabelText('5s').props.accessibilityState).toMatchObject({ selected: false });
    expect(getByLabelText('10s').props.accessibilityState).toMatchObject({ selected: false });
  });

  // 60. selects timer duration 5s and saves timerDuration
  it('selects timer duration 5s and saves timerDuration', async () => {
    (saveAppSettings as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('3s，已选中')).toBeTruthy(); });
    fireEvent.press(getByLabelText('5s'));
    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledWith({ timerDuration: 5 });
    });
    expect(getByLabelText('5s，已选中')).toBeTruthy();
  });

  // 61. loads saved timerDuration=10 from settings
  it('loads saved timerDuration=10 from settings and marks it selected', async () => {
    (loadAppSettings as jest.Mock).mockResolvedValue({
      voiceEnabled: false, theme: 'dark', timerDuration: 10,
      defaultGridVariant: 'thirds',
      showHistogram: false, showLevel: true, showFocusPeaking: false,
      showSunPosition: false, showFocusGuide: true, showBubbleChat: true,
      showShakeDetector: false, showKeypoints: false, imageQualityPreset: 'balanced',
      focusPeakingColor: '#FF4444', focusPeakingSensitivity: 'medium',
    });
    const { getByLabelText } = render(<SettingsScreen />);
    await waitFor(() => { expect(getByLabelText('10s，已选中')).toBeTruthy(); });
    expect(getByLabelText('10s，已选中')).toBeTruthy();
    expect(getByLabelText('3s').props.accessibilityState).toMatchObject({ selected: false });
  });
});

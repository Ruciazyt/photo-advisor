import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
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
  loadAppSettings: jest.fn(() => Promise.resolve({ voiceEnabled: false, theme: 'dark', timerDuration: 3 })),
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
    (loadAppSettings as jest.Mock).mockResolvedValue({ voiceEnabled: false, theme: 'dark', timerDuration: 3 });
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
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('关')).toBeTruthy();
    });
    fireEvent.press(getByText('关'));
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
    });
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('开')).toBeTruthy();
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
    // Replace mock implementation to capture the toggleTheme reference
    const originalImpl = ThemeContext.useTheme.getMockImplementation();
    let capturedToggleTheme: jest.Mock | null = null;
    ThemeContext.useTheme.mockImplementation(() => {
      const toggleTheme = jest.fn();
      capturedToggleTheme = toggleTheme;
      const result = originalImpl!();
      return { ...result, toggleTheme };
    });
    render(<SettingsScreen />);
    expect(capturedToggleTheme).not.toBeNull();
    // Find the theme toggle TouchableOpacity via UNSAFE_getAllByType
    const touchables = screen.UNSAFE_getAllByType(require('react-native').TouchableOpacity);
    const themeToggle = touchables.find((t) => t.props.onPress === capturedToggleTheme);
    expect(themeToggle).toBeDefined();
    fireEvent.press(themeToggle);
    expect(capturedToggleTheme!.mock.calls.length).toBe(1);
    // Restore original mock
    ThemeContext.useTheme.mockImplementation(originalImpl!);
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
});

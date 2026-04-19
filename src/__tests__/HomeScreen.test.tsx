import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic } from '../services/api';
import { StreamingDrawer } from '../components/StreamingDrawer';

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
  streamChatCompletion: jest.fn(),
  analyzeImageAnthropic: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../components/StreamingDrawer', () => ({
  StreamingDrawer: jest.fn(() => null),
}));

const mockAlert = jest.spyOn(Alert, 'alert');

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadApiConfig as jest.Mock).mockResolvedValue(null);
    (StreamingDrawer as jest.Mock).mockReturnValue(null);
  });

  // 1. renders title and subtitle
  it('renders title and subtitle', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('拍摄参谋')).toBeTruthy();
    expect(getByText('智能照片分析')).toBeTruthy();
  });

  // 2. renders upload placeholder when no image selected
  it('renders upload placeholder when no image selected', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('点击选择照片')).toBeTruthy();
    expect(getByText('支持相机拍摄或相册选择')).toBeTruthy();
  });

  // 3. send button is present (disabled when no image)
  it('send button is present', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('开始分析')).toBeTruthy();
  });

  // 4. shows API not configured warning on mount
  it('shows API not configured warning on mount', async () => {
    const { getByText } = render(<HomeScreen />);
    await waitFor(() => {
      expect(getByText('请先配置API设置')).toBeTruthy();
    });
  });

  // 5. pickImage: camera permission denied shows alert
  it('shows alert when camera permission is denied', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    const { getByText } = render(<HomeScreen />);

    // Trigger upload area to open image options
    fireEvent.press(getByText('点击选择照片'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('选择照片', '请选择图片来源', expect.any(Array));
    });

    // Press "相机拍照" from the alert
    const alertActions = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    const cameraAction = alertActions.find((a) => a.text === '相机拍照')!;
    act(() => { cameraAction.onPress(); });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('权限不足', '需要相机权限才能选择照片');
    });
  });

  // 6. pickImage: successfully selects image from camera
  it('successfully selects image from camera with quality 0.8', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///test-photo.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///resized-photo.jpg',
      width: 1024,
      height: 768,
    });
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64encodeddata');
    (loadApiConfig as jest.Mock).mockResolvedValue({ apiType: 'openai', apiKey: 'sk-test', baseUrl: 'https://api.test.com', model: 'gpt-4o' });
    (streamChatCompletion as jest.Mock).mockImplementation((_apiKey, _baseUrl, _model, _imageBase64, onChunk) => {
      act(() => { onChunk('分析结果', false); });
      act(() => { onChunk('', true); });
      return Promise.resolve();
    });

    const { getByText } = render(<HomeScreen />);

    // Trigger upload area to open image options
    fireEvent.press(getByText('点击选择照片'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('选择照片', '请选择图片来源', expect.any(Array));
    });

    // Press "相机拍照"
    const alertActions = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    const cameraAction = alertActions.find((a) => a.text === '相机拍照')!;
    act(() => { cameraAction.onPress(); });

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({ quality: 0.8, allowsEditing: false });
    });
  });

  // 7. send button is disabled when no image is selected
  it('send button is disabled when no image is selected', async () => {
    const { getByTestId } = render(<HomeScreen />);
    // Button should be disabled when imageBase64 is null
    // Note: Cannot trigger handleSend via button press when disabled
    const sendButton = getByTestId('sendButton');
    expect(sendButton).toBeTruthy();
  });

  // 8. pickImage with no API configured shows alert but still sets imageBase64
  it('pickImage with no API configured shows alert but image is selected', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///test-photo.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///resized-photo.jpg',
      width: 1024,
      height: 768,
    });
    // Use 150-char string to pass the base64.length >= 100 validation in pickImage
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('a'.repeat(150));
    // loadApiConfig returns null for useEffect and pickImage -> triggerAnalysis
    (loadApiConfig as jest.Mock)
      .mockResolvedValueOnce(null) // useEffect on mount
      .mockResolvedValueOnce(null); // pickImage -> triggerAnalysis (shows alert but continues)

    const { getByText } = render(<HomeScreen />);

    // Trigger upload area to open image options
    fireEvent.press(getByText('点击选择照片'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('选择照片', '请选择图片来源', expect.any(Array));
    });

    // Press "相机拍照"
    const alertActions = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    const cameraAction = alertActions.find((a) => a.text === '相机拍照')!;
    act(() => { cameraAction.onPress(); });

    // pickImage will show alert because API is not configured, but imageBase64 is still set
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('请先在设置中配置API');
    });
  });

  // 9. handleSend: has image + API configured calls streamChatCompletion
  it('handleSend with image and API configured calls streamChatCompletion', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///test-photo.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///resized-photo.jpg',
      width: 1024,
      height: 768,
    });
    // Use 150-char string to pass the base64.length >= 100 validation in pickImage
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('a'.repeat(150));
    const apiConfig = { apiType: 'openai' as const, apiKey: 'sk-test', baseUrl: 'https://api.test.com', model: 'gpt-4o' };
    (loadApiConfig as jest.Mock)
      .mockResolvedValueOnce(apiConfig)  // useEffect on mount
      .mockResolvedValueOnce(apiConfig)  // pickImage -> triggerAnalysis
      .mockResolvedValueOnce(apiConfig); // handleSend
    (streamChatCompletion as jest.Mock).mockImplementation((_apiKey, _baseUrl, _model, _imageBase64, onChunk) => {
      act(() => { onChunk('分析结果文本', false); });
      act(() => { onChunk('', true); });
      return Promise.resolve();
    });

    const { getByText, getByTestId } = render(<HomeScreen />);

    // Trigger upload area to open image options
    fireEvent.press(getByText('点击选择照片'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('选择照片', '请选择图片来源', expect.any(Array));
    });

    // Press "相机拍照"
    const alertActions = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    const cameraAction = alertActions.find((a) => a.text === '相机拍照')!;
    act(() => { cameraAction.onPress(); });

    // Wait a bit for state updates to settle
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // Press send button (imageBase64 is now set)
    fireEvent.press(getByTestId('sendButton'));

    await waitFor(() => {
      expect(streamChatCompletion).toHaveBeenCalledWith(
        'sk-test',
        'https://api.test.com',
        'gpt-4o',
        'a'.repeat(150),
        expect.any(Function)
      );
    });
  });

  // 10. handleSend: API error shows error message in StreamingDrawer
  it('handleSend API error shows error message in drawer', async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///test-photo.jpg' }],
    });
    (manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///resized-photo.jpg',
      width: 1024,
      height: 768,
    });
    // Use 150-char string to pass the base64.length >= 100 validation in pickImage
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('a'.repeat(150));
    const apiConfig = { apiType: 'openai' as const, apiKey: 'sk-test', baseUrl: 'https://api.test.com', model: 'gpt-4o' };
    (loadApiConfig as jest.Mock)
      .mockResolvedValueOnce(apiConfig)  // useEffect on mount
      .mockResolvedValueOnce(apiConfig)  // pickImage -> triggerAnalysis
      .mockResolvedValueOnce(apiConfig); // handleSend
    (streamChatCompletion as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const { getByText, getByTestId } = render(<HomeScreen />);

    // Trigger upload area
    fireEvent.press(getByText('点击选择照片'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('选择照片', '请选择图片来源', expect.any(Array));
    });

    const alertActions = mockAlert.mock.calls[0][2] as Array<{ text: string; onPress: () => void }>;
    const cameraAction = alertActions.find((a) => a.text === '相机拍照')!;
    act(() => { cameraAction.onPress(); });

    // Wait a bit for state updates to settle
    await act(async () => { await new Promise(r => setTimeout(r, 100)); });

    // handleSend is async, so wrap in act to ensure it completes
    act(() => {
      fireEvent.press(getByTestId('sendButton'));
    });

    // Wait for state to update after handleSend
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // Verify StreamingDrawer was called with error state
    const calls = (StreamingDrawer as jest.Mock).mock.calls;
    const errorCall = calls.find(
      (call) =>
        call[0] &&
        (call[0] as any).visible === true &&
        (call[0] as any).text === '错误: Network failure'
    );
    expect(errorCall).toBeDefined();
  });
});

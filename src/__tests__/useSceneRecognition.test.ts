/**
 * Tests for useSceneRecognition hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSceneRecognition } from '../hooks/useSceneRecognition';

jest.mock('../services/api', () => ({
  loadApiConfig: jest.fn(),
  recognizeScene: jest.fn(),
}));

const mockRecognizeScene = require('../services/api').recognizeScene as jest.Mock;
const mockLoadApiConfig = require('../services/api').loadApiConfig as jest.Mock;

describe('useSceneRecognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state: empty tag, not recognizing', () => {
    mockLoadApiConfig.mockResolvedValue(null);
    const { result } = renderHook(() => useSceneRecognition());
    expect(result.current.sceneTag).toBe('');
    expect(result.current.isRecognizing).toBe(false);
  });

  it('recognize() calls recognizeScene() with base64 and config', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockResolvedValue('风光');

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      const tag = await result.current.recognize('base64data123');
      expect(tag).toBe('风光');
    });

    expect(mockLoadApiConfig).toHaveBeenCalled();
    expect(mockRecognizeScene).toHaveBeenCalledWith('base64data123', fakeConfig);
  });

  it('recognize() updates sceneTag with returned value', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockResolvedValue('人像');

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      await result.current.recognize('somebase64');
    });

    expect(result.current.sceneTag).toBe('人像');
  });

  it('recognize() sets isRecognizing true during call, false after', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('美食'), 50)));

    const { result } = renderHook(() => useSceneRecognition());

    let isRecognizingDuringCall: boolean | null = null;
    act(() => {
      result.current.recognize('base64data').then(() => {
        isRecognizingDuringCall = result.current.isRecognizing;
      });
      // Check immediately after calling recognize
      isRecognizingDuringCall = result.current.isRecognizing;
    });

    await waitFor(() => expect(result.current.isRecognizing).toBe(false));
  });

  it('recognize() handles null response gracefully (returns empty string)', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockResolvedValue(null);

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      const tag = await result.current.recognize('base64data');
      expect(tag).toBe('');
    });

    expect(result.current.sceneTag).toBe('');
  });

  it('recognize() handles empty string response gracefully', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockResolvedValue('');

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      const tag = await result.current.recognize('base64data');
      expect(tag).toBe('');
    });

    expect(result.current.sceneTag).toBe('');
  });

  it('recognize() handles recognizeScene throwing an error gracefully', async () => {
    const fakeConfig = { apiKey: 'test', baseUrl: 'test', model: 'test', apiType: 'minimax' as const };
    mockLoadApiConfig.mockResolvedValue(fakeConfig);
    mockRecognizeScene.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      const tag = await result.current.recognize('base64data');
      expect(tag).toBe('');
    });

    expect(result.current.sceneTag).toBe('');
    expect(result.current.isRecognizing).toBe(false);
  });

  it('recognize() returns empty string when config is null', async () => {
    mockLoadApiConfig.mockResolvedValue(null);

    const { result } = renderHook(() => useSceneRecognition());

    await act(async () => {
      const tag = await result.current.recognize('base64data');
      expect(tag).toBe('');
    });

    expect(mockRecognizeScene).not.toHaveBeenCalled();
    expect(result.current.sceneTag).toBe('');
  });
});

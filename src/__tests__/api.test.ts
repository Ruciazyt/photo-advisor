/**
 * Tests for src/services/api.ts
 * Covers: testOpenAIConnection, testMinimaxConnection, saveApiConfig, loadApiConfig,
 * fetchAvailableModels, MINIMAX_MODELS constant
 */

// Mocks must be declared before importing the module under test.
// jest.mock is hoisted above all imports.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  testOpenAIConnection,
  testMinimaxConnection,
  saveApiConfig,
  loadApiConfig,
  fetchAvailableModels,
  MINIMAX_MODELS,
  MINIMAX_VLM_URL,
} from '../services/api';
import { AppError } from '../services/errors';

const mockAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
// Cast AsyncStorage mock so TypeScript knows it has Jest mock methods
const MockAsyncStorage = AsyncStorage as unknown as {
  multiGet: jest.MockedFunction<(_keys: readonly string[]) => Promise<readonly [string, string | null][]>>;
  multiSet: jest.MockedFunction<(_pairs: readonly [string, string][]) => Promise<void>>;
};

describe('MINIMAX_MODELS constant', () => {
  it('contains at least 3 model options', () => {
    expect(MINIMAX_MODELS.length).toBeGreaterThanOrEqual(3);
  });

  it('each model has id and name', () => {
    MINIMAX_MODELS.forEach((model) => {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(typeof model.id).toBe('string');
      expect(typeof model.name).toBe('string');
    });
  });

  it('MiniMax-M2.7 is the first (latest/high-precision) model', () => {
    expect(MINIMAX_MODELS[0].id).toBe('MiniMax-M2.7');
  });
});

describe('MINIMAX endpoint URLs', () => {
  it('MINIMAX_VLM_URL is set and contains minimaxi.com', () => {
    expect(MINIMAX_VLM_URL).toBeTruthy();
    expect(MINIMAX_VLM_URL).toContain('minimaxi.com');
  });
});

describe('testOpenAIConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok:true when API responds with 200', async () => {
    mockAxiosGet.mockResolvedValue({ status: 200 });

    const result = await testOpenAIConnection('sk-test-key', 'https://api.example.com/v1/chat/completions');
    expect(result).toEqual({ ok: true });
  });

  it('returns ok:false with error string on non-200 status', async () => {
    mockAxiosGet.mockResolvedValue({ status: 401 });

    const result = await testOpenAIConnection('sk-bad', 'https://api.example.com');
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('returns ok:false when axios throws', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network failure'));

    const result = await testOpenAIConnection('sk-test', 'https://api.example.com');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Network failure');
  });

  it('strips trailing slashes and /chat/completions from baseUrl before calling /models', async () => {
    mockAxiosGet.mockResolvedValue({ status: 200 });

    await testOpenAIConnection('sk-test', 'https://api.example.com/v1/chat/completions/');

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'https://api.example.com/v1/models',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }) })
    );
  });
});

describe('testMinimaxConnection', () => {
  const _globalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = _globalFetch;
  });

  it('returns ok:true when fetch responds with ok=true', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    const result = await testMinimaxConnection('test-key');
    expect(result).toEqual({ ok: true });
  });

  it('returns ok:false with HTTP status in error when fetch responds with ok=false', async () => {
    mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));

    const result = await testMinimaxConnection('bad-key');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('401');
  });

  it('returns ok:false with timeout message when ECONNABORTED', async () => {
    mockFetch.mockRejectedValue({ code: 'ECONNABORTED' });

    const result = await testMinimaxConnection('test-key');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('超时');
  });

  it('returns ok:false with network error message when ERR_NETWORK', async () => {
    mockFetch.mockRejectedValue({ code: 'ERR_NETWORK' });

    const result = await testMinimaxConnection('test-key');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('网络');
  });

  it('returns ok:false with generic message on unknown fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Unknown error'));

    const result = await testMinimaxConnection('test-key');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('saveApiConfig / loadApiConfig', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('saveApiConfig', () => {
    it('saves all 4 keys to AsyncStorage for openai', async () => {
      await saveApiConfig('sk-test', 'https://api.example.com', 'gpt-4', 'openai');

      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', 'sk-test'],
        ['photo_advisor_base_url', 'https://api.example.com'],
        ['photo_advisor_model', 'gpt-4'],
      ]);
    });

    it('saves all 4 keys to AsyncStorage for minimax', async () => {
      await saveApiConfig('mmx-key', '', 'MiniMax-M2.7', 'minimax');

      expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
        ['photo_advisor_api_type', 'minimax'],
        ['photo_advisor_api_key', 'mmx-key'],
        ['photo_advisor_base_url', ''],
        ['photo_advisor_model', 'MiniMax-M2.7'],
      ]);
    });
  });

  describe('loadApiConfig', () => {
    it('returns null when apiKey is null', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', null],
        ['photo_advisor_base_url', 'https://api.example.com'],
        ['photo_advisor_model', 'gpt-4'],
      ]);

      const result = await loadApiConfig();
      expect(result).toBeNull();
    });

    it('returns null when openai apiKey is "null" string', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', 'null'],
        ['photo_advisor_base_url', 'https://api.example.com'],
        ['photo_advisor_model', 'gpt-4'],
      ]);

      const result = await loadApiConfig();
      expect(result).toBeNull();
    });

    it('returns null for openai when baseUrl is null', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', 'sk-test'],
        ['photo_advisor_base_url', null],
        ['photo_advisor_model', 'gpt-4'],
      ]);

      const result = await loadApiConfig();
      expect(result).toBeNull();
    });

    it('returns null for openai when model is null', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', 'sk-test'],
        ['photo_advisor_base_url', 'https://api.example.com'],
        ['photo_advisor_model', null],
      ]);

      const result = await loadApiConfig();
      expect(result).toBeNull();
    });

    it('returns full config for openai', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'openai'],
        ['photo_advisor_api_key', 'sk-test'],
        ['photo_advisor_base_url', 'https://api.example.com'],
        ['photo_advisor_model', 'gpt-4'],
      ]);

      const result = await loadApiConfig();
      expect(result).toEqual({
        apiType: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://api.example.com',
        model: 'gpt-4',
      });
    });

    it('returns config for minimax without baseUrl', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'minimax'],
        ['photo_advisor_api_key', 'mmx-key'],
        ['photo_advisor_base_url', ''],
        ['photo_advisor_model', 'MiniMax-M2.7'],
      ]);

      const result = await loadApiConfig();
      expect(result).toEqual({
        apiType: 'minimax',
        apiKey: 'mmx-key',
        baseUrl: '',
        model: 'MiniMax-M2.7',
      });
    });

    it('returns null when all values are "null" strings', async () => {
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        ['photo_advisor_api_type', 'null'],
        ['photo_advisor_api_key', 'null'],
        ['photo_advisor_base_url', 'null'],
        ['photo_advisor_model', 'null'],
      ]);

      const result = await loadApiConfig();
      expect(result).toBeNull();
    });
  });
});

describe('fetchAvailableModels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses models from response.data array with id and name', async () => {
    mockAxiosGet.mockResolvedValue({
      data: [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5', name: 'GPT-3.5' },
      ],
    });

    const result = await fetchAvailableModels('sk-test', 'https://api.example.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toHaveLength(2);
      expect(result.models[0].id).toBe('gpt-4');
      expect(result.models[1].id).toBe('gpt-3.5');
    }
  });

  it('handles flat array response format', async () => {
    mockAxiosGet.mockResolvedValue({ data: ['model-a', 'model-b'] });

    const result = await fetchAvailableModels('sk-test', 'https://api.example.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models).toHaveLength(2);
      expect(result.models[0].id).toBe('model-a');
      expect(result.models[1].id).toBe('model-b');
    }
  });

  it('handles response.data.data format (OpenAI style)', async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        data: [{ id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }],
      },
    });

    const result = await fetchAvailableModels('sk-test', 'https://api.example.com');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.models[0].id).toBe('gpt-4-turbo');
    }
  });

  it('returns error result when axios throws', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Connection refused'));

    const result = await fetchAvailableModels('sk-test', 'https://api.example.com');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AppError);
    }
  });

  it('strips trailing slashes and /chat/completions from baseUrl', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] });

    await fetchAvailableModels('sk-test', 'https://api.example.com/v1/chat/completions/');

    expect(mockAxiosGet).toHaveBeenCalledWith(
      'https://api.example.com/v1/models',
      expect.any(Object)
    );
  });
});

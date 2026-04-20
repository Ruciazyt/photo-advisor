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
  streamChatCompletion,
  analyzeImageAnthropic,
  recognizeScene,
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

describe('streamChatCompletion', () => {
  const _globalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = _globalFetch;
  });

  it('calls onChunk with delta content for each SSE data line', async () => {
    const chunks: string[] = [];
    const onChunk = jest.fn((text: string, done: boolean) => {
      if (!done) chunks.push(text);
    });

    const mockBody = {
      getReader: () => {
        const lines = [
          'data: {"choices":[{"delta":{"content":"第一句"}}]}',
          'data: {"choices":[{"delta":{"content":"第二句"}}]}',
          'data: [DONE]',
        ];
        let i = 0;
        return {
          read: async () => {
            if (i >= lines.length) return { done: true, value: undefined };
            const line = lines[i++];
            const encoder = new TextEncoder();
            return { done: false, value: encoder.encode(line + '\n') };
          },
          releaseLock: () => {},
        };
      },
    };
    mockFetch.mockResolvedValue(new Response(mockBody as unknown as Body, { status: 200 }));

    await streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', onChunk);

    expect(onChunk).toHaveBeenCalledWith('第一句', false);
    expect(onChunk).toHaveBeenCalledWith('第二句', false);
    expect(onChunk).toHaveBeenLastCalledWith('', true);
  });

  it('throws APIError on non-200 response', async () => {
    mockFetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    await expect(
      streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', jest.fn())
    ).rejects.toThrow();
  });

  it('throws APIError on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(
      streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', jest.fn())
    ).rejects.toThrow('网络连接失败');
  });

  it('throws APIError when response body is null', async () => {
    mockFetch.mockResolvedValue(new Response(null as unknown as Body, { status: 200 }));
    await expect(
      streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', jest.fn())
    ).rejects.toThrow('响应体为空');
  });

  it('skips malformed JSON lines without calling onChunk', async () => {
    const onChunk = jest.fn();
    const mockBody = {
      getReader: () => {
        const lines = [
          'data: {"choices":[{"delta":{"content":"有效"}}]}',
          'data: not json at all',
          'data: {"bad","json"}',
          'data: {"choices":[{"delta":{"content":"也有效"}}]}',
          'data: [DONE]',
        ];
        let i = 0;
        return {
          read: async () => {
            if (i >= lines.length) return { done: true, value: undefined };
            const line = lines[i++];
            const encoder = new TextEncoder();
            return { done: false, value: encoder.encode(line + '\n') };
          },
          releaseLock: () => {},
        };
      },
    };
    mockFetch.mockResolvedValue(new Response(mockBody as unknown as Body, { status: 200 }));

    await streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', onChunk);

    // Valid JSON chunks only trigger onChunk calls (malformed lines skipped)
    expect(onChunk).toHaveBeenCalledWith('有效', false);
    expect(onChunk).toHaveBeenCalledWith('也有效', false);
  });

  it('appends extraPrompt to base prompt in request body', async () => {
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      return new Response(
        {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
            releaseLock: () => {},
          }),
        } as unknown as Body,
        { status: 200 }
      );
    });

    await streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', jest.fn(), '另加一个要求');

    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = JSON.parse((lastCall[1] as RequestInit).body as string);
    const userContent = body.messages.find((m: any) => m.role === 'user').content;
    const textPart = Array.isArray(userContent) ? userContent.find((p: any) => p.type === 'text') : null;
    const promptText = Array.isArray(userContent) ? textPart?.text : userContent;
    expect(promptText).toContain('另加一个要求');
  });

  it('sends stream:true in request body', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        {
          getReader: () => ({
            read: async () => ({ done: true, value: undefined }),
            releaseLock: () => {},
          }),
        } as unknown as Body,
        { status: 200 }
      )
    );

    await streamChatCompletion('sk-test', 'https://api.example.com', 'gpt-4', 'abc123', jest.fn());

    const lastCall = mockFetch.mock.calls[0];
    const body = JSON.parse((lastCall[1] as RequestInit).body as string);
    expect(body.stream).toBe(true);
  });
});

describe('analyzeImageAnthropic', () => {
  const _globalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
    // Note: no fake timers — the streaming loop uses real setTimeout(15ms) delays
  });

  afterEach(() => {
    globalThis.fetch = _globalFetch;
  });

  it('returns full text after simulated streaming completes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '第一句。第二句！' }),
      text: async () => '',
    });

    const onChunk = jest.fn();

    // The function returns after streaming loop completes (total ~30ms of fake timers)
    const result = await analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', onChunk);

    expect(result).toBe('第一句。第二句！');
    expect(onChunk).toHaveBeenCalledWith('第一句。', false);
    expect(onChunk).toHaveBeenCalledWith('第二句！', false);
  });

  it('throws APIError on HTTP 401 (auth failed)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-bad', 'MiniMax-M2.7', jest.fn())
    ).rejects.toMatchObject({ code: expect.stringContaining('AUTH') });
  });

  it('throws APIError on HTTP 429 (rate limited)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn())
    ).rejects.toMatchObject({ code: expect.stringContaining('RATE') });
  });

  it('throws APIError on HTTP 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn())
    ).rejects.toThrow();
    // Error message is derived from thrown Error's message via errorToString
  });

  it('throws APIError when response JSON is invalid', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => { throw new Error('JSON parse error'); },
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn())
    ).rejects.toThrow();
    // Error message is derived from thrown Error's message via errorToString
  });

  it('throws APIError when API returns non-zero status_code', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: 'some text',
        base_resp: { status_code: 1001, status_msg: 'invalid image' },
      }),
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn())
    ).rejects.toThrow('API错误(1001)');
  });

  it('throws APIError when content is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '   ' }),
    });

    await expect(
      analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn())
    ).rejects.toThrow('未收到有效回复');
  });

  it('appends extraPrompt to prompt in request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '结果' }),
    });

    const result = await analyzeImageAnthropic('abc123', 'sk-test', 'MiniMax-M2.7', jest.fn(), '额外要求');

    const lastCall = mockFetch.mock.calls[0];
    const body = JSON.parse((lastCall[1] as RequestInit).body as string);
    expect(body.prompt).toContain('额外要求');
    expect(result).toBe('结果');
  });
});

describe('recognizeScene', () => {
  const _globalFetch = globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = _globalFetch;
  });

  it('returns first 2 characters of content on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '人像摄影' }),
    });

    const result = await recognizeScene('abc123', {
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'MiniMax-M2.7',
      apiType: 'minimax',
    });

    expect(result).toBe('人像');
  });

  it('returns empty string when content is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '' }),
    });

    const result = await recognizeScene('abc123', {
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'MiniMax-M2.7',
      apiType: 'minimax',
    });

    expect(result).toBe('');
  });

  it('returns empty string on HTTP error (safeAsync catches and returns null)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await recognizeScene('abc123', {
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'MiniMax-M2.7',
      apiType: 'minimax',
    });

    expect(result).toBe('');
  });

  it('returns empty string when API returns non-zero status_code', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        base_resp: { status_code: 1001, status_msg: 'error' },
      }),
    });

    const result = await recognizeScene('abc123', {
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'MiniMax-M2.7',
      apiType: 'minimax',
    });

    expect(result).toBe('');
  });

  it('sends correct request body with scene recognition prompt', async () => {
    let capturedBody: any;
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      capturedBody = JSON.parse(init.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: '风光' }),
      };
    });

    await recognizeScene('abc123', {
      apiKey: 'sk-test',
      baseUrl: '',
      model: 'MiniMax-M2.7',
      apiType: 'minimax',
    });

    expect(capturedBody.prompt).toContain('场景类型');
    expect(capturedBody.image_url).toContain('data:image/jpeg;base64,abc123');
    expect(capturedBody.prompt).toContain('不超过2个字');
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

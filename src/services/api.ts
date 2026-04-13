import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  AppError,
  APIError,
  ErrorCode,
  errorToString,
  handleError,
  safeAsync,
  resultOf,
} from './errors';

// MiniMax Vision (VL-01) 专用端点
export const MINIMAX_VLM_URL = 'https://api.minimaxi.com/v1/coding_plan/vlm';
// MiniMax Anthropic API 端点（纯文本，无图片支持）
const MINIMAX_ANTHROPIC_URL = 'https://api.minimaxi.com/anthropic/v1/messages';

export { errorToString as extractErrorMessage } from './errors';

export async function testOpenAIConnection(
  apiKey: string,
  baseUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, '');
    const modelsUrl = cleanUrl + '/models';
    const response = await axios.get(modelsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    if (response.status === 200) return { ok: true };
    return { ok: false, error: `HTTP ${response.status}` };
  } catch (e: unknown) {
    const err = handleError(e, {
      context: 'testOpenAIConnection',
      silent: true,
      showAlert: false,
    });
    return { ok: false, error: err.message };
  }
}

export async function testMinimaxConnection(
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(MINIMAX_ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (response.ok) return { ok: true };
    const text = await response.text();
    return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 100)}` };
  } catch (e: unknown) {
    const err = e as Record<string, unknown>;
    const code = err.code as string | undefined;
    let appError: AppError;
    if (code === 'ECONNABORTED') {
      appError = new APIError('连接超时，请检查网络', ErrorCode.API_TIMEOUT, undefined, 'warning', true);
    } else if (code === 'ERR_NETWORK') {
      appError = new APIError('网络错误，请检查网络连接', ErrorCode.API_NETWORK_ERROR, undefined, 'warning', true);
    } else {
      appError = new APIError(errorToString(e, '连接失败'), ErrorCode.API_NETWORK_ERROR, undefined, 'warning', true);
    }
    handleError(appError, { silent: true, showAlert: false, context: 'testMinimaxConnection' });
    return { ok: false, error: appError.message };
  }
}

export const MINIMAX_MODELS = [
  { id: 'MiniMax-M2.7', name: 'MiniMax-M2.7（最新·高精度）' },
  { id: 'MiniMax-M2.5', name: 'MiniMax-M2.5（均衡）' },
  { id: 'MiniMax-M2.5-Lightning', name: 'MiniMax-M2.5-Lightning（快速）' },
  { id: 'MiniMax-M2.5-Highspeed', name: 'MiniMax-M2.5-Highspeed（极速）' },
];

const STORAGE_KEYS = {
  API_TYPE: 'photo_advisor_api_type',
  API_KEY: 'photo_advisor_api_key',
  BASE_URL: 'photo_advisor_base_url',
  MODEL: 'photo_advisor_model',
};

export interface Model {
  id: string;
  name: string;
}

export interface ChatMessageContent {
  type: 'text' | 'image' | 'image_url';
  text?: string;
  image_url?: { url: string };
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ChatMessageContent[];
}

export async function saveApiConfig(
  apiKey: string,
  baseUrl: string,
  model: string,
  apiType: 'openai' | 'minimax' = 'openai'
): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.API_TYPE, apiType],
    [STORAGE_KEYS.API_KEY, apiKey],
    [STORAGE_KEYS.BASE_URL, baseUrl],
    [STORAGE_KEYS.MODEL, model],
  ]);
}

export async function loadApiConfig(): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: 'openai' | 'minimax';
} | null> {
  const results = await AsyncStorage.multiGet([
    STORAGE_KEYS.API_TYPE,
    STORAGE_KEYS.API_KEY,
    STORAGE_KEYS.BASE_URL,
    STORAGE_KEYS.MODEL,
  ]);
  const [apiType, apiKey, baseUrl, model] = results.map(([, v]) => v ?? '');
  if (!apiKey || apiKey === 'null') return null;
  // For MiniMax, baseUrl is not required
  if (apiType !== 'minimax' && (!baseUrl || !model || baseUrl === 'null' || model === 'null')) return null;
  if (apiType === 'minimax' && (!model || model === 'null')) return null;
  return {
    apiType: (apiType === 'minimax' ? 'minimax' : 'openai') as 'openai' | 'minimax',
    apiKey,
    baseUrl: baseUrl ?? '',
    model,
  };
}

export async function fetchAvailableModels(
  apiKey: string,
  baseUrl: string
): Promise<{ ok: true; models: Model[] } | { ok: false; error: AppError }> {
  const result = await resultOf(async () => {
    const cleanUrl = baseUrl.replace(/\/+$/, '').replace(/\/chat\/completions\/?$/, '');
    const response = await axios.get(`${cleanUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 15000,
    });
    const data = response.data;
    const models: Model[] = [];
    const list = Array.isArray(data) ? data : data.data ?? [];
    for (const m of list) {
      const id = typeof m === 'string' ? m : m.id;
      const name = typeof m === 'string' ? m : (m.name ?? m.id ?? '');
      if (id) models.push({ id: String(id), name: String(name) });
    }
    return models;
  }, ErrorCode.API_INVALID_RESPONSE);

  if (!result.ok) {
    handleError(result.error, { silent: true, showAlert: false, context: 'fetchAvailableModels' });
    return { ok: false, error: result.error };
  }
  return { ok: true, models: result.value };
}

export interface StreamCallback {
  (text: string, done: boolean): void;
}

export async function streamChatCompletion(
  apiKey: string,
  baseUrl: string,
  model: string,
  imageBase64: string,
  onChunk: StreamCallback,
  extraPrompt?: string,
): Promise<void> {
  const url = `${baseUrl}/chat/completions`;
  const baseText = '你是一位严格的摄影顾问。返回1-3条构图建议，每条格式为：`[位置] 具体建议内容`\n位置从[左上/右上/左下/右下/中间]选取。\n单条建议不超过25字。\n不同建议用换行分隔。' + (extraPrompt ? `\n\n${extraPrompt}` : '');
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: baseText },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    },
  ];

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 150 }),
    });
  } catch (e) {
    const appErr = new APIError(
      errorToString(e, '网络连接失败'),
      ErrorCode.API_NETWORK_ERROR,
      undefined,
      'error',
      true
    );
    handleError(appErr, { context: 'streamChatCompletion.fetch' });
    throw appErr;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const appErr = new APIError(
      `API错误 ${response.status}: ${response.statusText} ${errText}`.slice(0, 300),
      response.status === 401 ? ErrorCode.API_AUTH_FAILED :
      response.status === 429 ? ErrorCode.API_RATE_LIMITED :
      ErrorCode.API_SERVER_ERROR,
      response.status,
      'error',
      true
    );
    handleError(appErr, { context: 'streamChatCompletion.response' });
    throw appErr;
  }

  if (!response.body) {
    const appErr = new APIError('响应体为空', ErrorCode.API_INVALID_RESPONSE, undefined, 'error', true);
    handleError(appErr, { context: 'streamChatCompletion.body' });
    throw appErr;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6).trim();
        if (data === '[DONE]') {
          onChunk('', true);
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (delta) onChunk(delta, false);
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onChunk('', true);
}

export interface AnthropicStreamCallback {
  (text: string): void;
}

export async function analyzeImageAnthropic(
  imageBase64: string,
  apiKey: string,
  _model: string,
  onChunk: AnthropicStreamCallback,
  extraPrompt?: string,
): Promise<string> {
  const basePrompt = '你是一位严格的摄影顾问。返回1-3条构图建议，每条格式为：`[位置] 具体建议内容`\n位置从[左上/右上/左下/右下/中间]选取。\n单条建议不超过25字。\n不同建议用换行分隔。' + (extraPrompt ? `\n\n${extraPrompt}` : '');
  const requestBody = {
    prompt: basePrompt,
    image_url: `data:image/jpeg;base64,${imageBase64}`,
  };

  let response: Response;
  try {
    response = await fetch(MINIMAX_VLM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'MM-API-Source': 'photo-advisor',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (e) {
    const appErr = new APIError(
      errorToString(e, '网络连接失败'),
      ErrorCode.API_NETWORK_ERROR,
      undefined,
      'error',
      true
    );
    handleError(appErr, { context: 'analyzeImageAnthropic.fetch' });
    throw appErr;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const appErr = new APIError(
      `HTTP ${response.status}: ${text.slice(0, 300)}`,
      response.status === 401 ? ErrorCode.API_AUTH_FAILED :
      response.status === 429 ? ErrorCode.API_RATE_LIMITED :
      ErrorCode.API_SERVER_ERROR,
      response.status,
      'error',
      true
    );
    handleError(appErr, { context: 'analyzeImageAnthropic.response' });
    throw appErr;
  }

  let json: Record<string, unknown>;
  try {
    json = await response.json();
  } catch (e) {
    const appErr = new APIError(
      errorToString(e, '无效的服务器响应'),
      ErrorCode.API_INVALID_RESPONSE,
      undefined,
      'error',
      true
    );
    handleError(appErr, { context: 'analyzeImageAnthropic.json' });
    throw appErr;
  }

  const baseResp = (json.base_resp ?? json.baseResp ?? {}) as Record<string, unknown>;
  const statusCode = baseResp.status_code as number | undefined;
  if (statusCode !== undefined && statusCode !== 0) {
    const appErr = new APIError(
      `API错误(${statusCode}): ${(baseResp.status_msg as string) ?? '未知错误'}`,
      ErrorCode.API_SERVER_ERROR,
      statusCode,
      'error',
      true
    );
    handleError(appErr, { context: 'analyzeImageAnthropic.apiError' });
    throw appErr;
  }

  const fullText = (json.content as string) ?? '';
  if (!fullText.trim()) {
    const appErr = new APIError('未收到有效回复', ErrorCode.API_INVALID_RESPONSE, undefined, 'error', true);
    handleError(appErr, { context: 'analyzeImageAnthropic.empty' });
    throw appErr;
  }

  // Simulate streaming by sentences
  const sentences = fullText.split(/(?<=[。！？；])/);
  for (const sentence of sentences) {
    if (sentence.trim()) {
      onChunk(sentence);
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }

  return fullText;
}

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiType: 'openai' | 'minimax';
}

export async function recognizeScene(
  base64: string,
  config: ApiConfig,
): Promise<string> {
  const prompt =
    '请识别这张照片的场景类型，只需返回一个词：人像/风光/美食/建筑/夜景/微距/静物/其他。不超过2个字。';
  const requestBody = {
    prompt,
    image_url: `data:image/jpeg;base64,${base64}`,
  };

  const result = await safeAsync(
    async (): Promise<string> => {
      const response = await fetch(MINIMAX_VLM_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'MM-API-Source': 'photo-advisor',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}`,
          ErrorCode.API_SERVER_ERROR,
          response.status,
          'warning',
          true
        );
      }

      const json = await response.json();
      const baseResp = (json.base_resp ?? {}) as Record<string, unknown>;
      const statusCode = baseResp.status_code as number | undefined;
      if (statusCode !== undefined && statusCode !== 0) {
        throw new APIError(
          `API错误(${statusCode})`,
          ErrorCode.API_SERVER_ERROR,
          statusCode,
          'warning',
          true
        );
      }

      const content = ((json.content as string) ?? '').trim();
      if (!content) return '';
      return content.slice(0, 2);
    },
    null,
    { context: 'recognizeScene', alertTitle: '场景识别失败' }
  );

  return result ?? '';
}


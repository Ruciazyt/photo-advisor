import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// MiniMax Vision (VL-01) 专用端点
export const MINIMAX_VLM_URL = 'https://api.minimaxi.com/v1/coding_plan/vlm';
// MiniMax Anthropic API 端点（纯文本，无图片支持）
const MINIMAX_ANTHROPIC_URL = 'https://api.minimaxi.com/anthropic/v1/messages';

export function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  const err = e as Record<string, unknown>;
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.msg && typeof err.msg === 'string') return err.msg;
  return String(e);
}

export const testOpenAIConnection = async (
  apiKey: string,
  baseUrl: string
): Promise<{ ok: boolean; error?: string }> => {
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
    return { ok: false, error: extractErrorMessage(e) };
  }
};

export const testMinimaxConnection = async (
  apiKey: string
): Promise<{ ok: boolean; error?: string }> => {
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
    if (code === 'ECONNABORTED') return { ok: false, error: '连接超时，请检查网络' };
    if (code === 'ERR_NETWORK') return { ok: false, error: '网络错误，请检查网络连接' };
    return { ok: false, error: '连接失败' };
  }
};

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

export async function fetchAvailableModels(apiKey: string, baseUrl: string): Promise<Model[]> {
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
        {
          type: 'text',
          text: baseText,
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API错误: ${response.status} ${response.statusText} ${errText}`);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
  // MiniMax VL-01 专用端点
  const basePrompt = '你是一位严格的摄影顾问。返回1-3条构图建议，每条格式为：`[位置] 具体建议内容`\n位置从[左上/右上/左下/右下/中间]选取。\n单条建议不超过25字。\n不同建议用换行分隔。' + (extraPrompt ? `\n\n${extraPrompt}` : '');
  const requestBody = {
    prompt: basePrompt,
    image_url: `data:image/jpeg;base64,${imageBase64}`,
  };

  const response = await fetch(MINIMAX_VLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'MM-API-Source': 'photo-advisor',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const json = await response.json();

  // Check for API-level error
  const baseResp = json.base_resp ?? {};
  if (baseResp.status_code !== 0) {
    throw new Error(`API错误(${baseResp.status_code}): ${baseResp.status_msg ?? '未知错误'}`);
  }

  const fullText = (json.content as string) ?? '';
  if (!fullText.trim()) {
    throw new Error('未收到有效回复');
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


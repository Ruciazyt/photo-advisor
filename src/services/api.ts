import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const MINIMAX_BASE_URL = 'https://api.minimaxi.com/anthropic/v1/messages';

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
    const response = await fetch(MINIMAX_BASE_URL, {
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
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
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
): Promise<void> {
  const url = `${baseUrl}/chat/completions`;
  const messages: ChatMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '你是一位专业的摄影顾问。请分析这张照片，从构图、光线、色彩、主题表达等角度给出详细的评价和改进建议。用中文回答。',
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
  model: string,
  onChunk: AnthropicStreamCallback,
): Promise<string> {
  // Step 1: Show base64 info
  const step1 = `\n[步骤1] 图片数据: base64长度=${imageBase64.length}`;
  console.log('[analyzeImageAnthropic]', step1);
  onChunk(step1);

  // Step 2: Send request
  const step2 = `\n[步骤2] 发送请求到 ${MINIMAX_BASE_URL} 模型=${model}`;
  console.log('[analyzeImageAnthropic]', step2);
  onChunk(step2);

  const requestBody = {
    model,
    max_tokens: 8192,
    stream: false,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
        },
        {
          type: 'text',
          text: '请分析这张照片，从构图、光线、色彩、拍摄角度等方面给出专业的摄影调整建议，用中文回复。',
        },
      ],
    }],
  };

  const response = await fetch(MINIMAX_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  const step3 = `\n[步骤3] 收到响应: HTTP ${response.status} ok=${response.ok}`;
  console.log('[analyzeImageAnthropic]', step3);
  onChunk(step3);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const errMsg = `\n[错误] HTTP失败: ${response.status} ${text.slice(0, 300)}`;
    console.log('[analyzeImageAnthropic]', errMsg);
    onChunk(errMsg);
    return errMsg;
  }

  const json = await response.json();

  const step4 = `\n[步骤4] 解析响应: id=${json.id ?? 'none'} type=${json.type ?? 'none'} stop_reason=${json.stop_reason ?? 'none'}`;
  console.log('[analyzeImageAnthropic]', step4);
  onChunk(step4);

  // Check for API-level error even when HTTP status is 200
  if (json.error || json.type === 'error') {
    const errMsg = `\n[错误] API错误: ${json.error?.type ?? 'unknown'} - ${json.error?.message ?? JSON.stringify(json.error)}`;
    console.log('[analyzeImageAnthropic]', errMsg);
    onChunk(errMsg);
    return errMsg;
  }

  const content = json.content ?? [];
  // Filter out thinking/internal blocks before displaying in UI
  const visibleContent = (content as Array<{ type: string }>).filter((b) => b.type !== 'thinking');
  const step5 = `\n[步骤5] content数组: ${JSON.stringify(visibleContent).slice(0, 300)}`;
  console.log('[analyzeImageAnthropic]', step5);
  onChunk(step5);

  // Extract text from response blocks (skip thinking/internal blocks)
  let fullText = '';
  for (const block of content as Array<{ type: string; text?: string }>) {
    if (block.type === 'text' && block.text) {
      fullText += block.text;
    }
    // Skip thinking blocks — they are internal reasoning, not for users
  }

  if (!fullText.trim()) {
    const debug = `\n[调试] 没有文本内容，完整响应: ${JSON.stringify(json).slice(0, 500)}`;
    console.log('[analyzeImageAnthropic]', debug);
    onChunk(debug);
    return debug;
  }

  const step6 = `\n[步骤6] AI回复长度=${fullText.length}字符`;
  console.log('[analyzeImageAnthropic]', step6);
  onChunk(step6);

  // Simulate streaming by sentences
  const sentences = fullText.split(/(?<=[。！？；])/);
  for (const sentence of sentences) {
    if (sentence.trim()) {
      onChunk(sentence);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  }

  return fullText;
}


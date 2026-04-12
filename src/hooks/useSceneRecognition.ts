import { useState, useCallback } from 'react';
import { recognizeScene, loadApiConfig } from '../services/api';

export interface UseSceneRecognitionReturn {
  sceneTag: string;
  isRecognizing: boolean;
  recognize: (base64: string) => Promise<string>;
}

export function useSceneRecognition(): UseSceneRecognitionReturn {
  const [sceneTag, setSceneTag] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);

  const recognize = useCallback(async (base64: string): Promise<string> => {
    setIsRecognizing(true);
    try {
      const config = await loadApiConfig();
      if (!config) {
        setSceneTag('');
        return '';
      }
      const result = await recognizeScene(base64, config);
      const tag = result ?? '';
      setSceneTag(tag);
      return tag;
    } catch {
      setSceneTag('');
      return '';
    } finally {
      setIsRecognizing(false);
    }
  }, []);

  return { sceneTag, isRecognizing, recognize };
}

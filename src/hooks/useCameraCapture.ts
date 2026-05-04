import { useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { loadApiConfig, streamChatCompletion, analyzeImageAnthropic } from '../services/api';
import { supportsRawCapture, captureRawNative } from '../services/camera2';

import { logger } from '../utils/logger';

import type { ImageQualityPreset } from '../types';
import { loadAppSettings } from '../services/settings';
import { Keypoint, bubbleTextToKeypoint } from '../components/KeypointOverlay';

/** Returns resize width and compress quality for a given image quality preset. */
export function getImageQualitySettings(preset: ImageQualityPreset): { resizeWidth: number; compress: number } {
  switch (preset) {
    case 'size':
      return { resizeWidth: 1024, compress: 0.7 };
    case 'balanced':
      return { resizeWidth: 1536, compress: 0.8 };
    case 'quality':
      return { resizeWidth: 2048, compress: 0.9 };
  }
}

/** Parse a raw text stream chunk into complete suggestion sentences.
 *  Splits on newlines or Chinese sentence-ending punctuation. */
export function parseSuggestions(buffer: string, newChunk: string): { done: string[]; remaining: string } {
  const combined = buffer + newChunk;
  const parts = combined.split(/(?<=[。！？；\n])/);
  const remaining = parts.pop() ?? '';
  const done = parts.map(p => p.trim()).filter(p => p.length > 3);
  return { done, remaining };
}

interface UseCameraCaptureOptions {
  cameraRef: React.RefObject<CameraView | null>;
  cameraReady: boolean;
  onSuggestionsChange: React.Dispatch<React.SetStateAction<string[]>>;
  onLoadingChange: (loading: boolean) => void;
  onKeypointsChange: React.Dispatch<React.SetStateAction<Keypoint[]>>;
  onShowKeypointsChange: (show: boolean) => void;
}

export function useCameraCapture({
  cameraRef,
  cameraReady,
  onSuggestionsChange,
  onLoadingChange,
  onKeypointsChange,
  onShowKeypointsChange,
}: UseCameraCaptureOptions) {
  const textBufferRef = useRef('');

  const takePicture = useCallback(async (raw = false): Promise<{ base64: string; uri: string } | null> => {
    if (!cameraRef.current || !cameraReady) return null;
    try {
      const settings = await loadAppSettings();
      const { resizeWidth, compress } = getImageQualitySettings(settings.imageQualityPreset);

      // If RAW is requested, try native capture first (Android only)
      if (raw && Platform.OS === 'android') {
        const rawResult = await captureRawNative();
        if (rawResult?.uri) {
          // RAW capture succeeded — apply quality preset before returning base64
          let base64 = '';
          try {
            const resized = await manipulateAsync(
              rawResult.uri,
              [{ resize: { width: resizeWidth } }],
              { compress, format: SaveFormat.JPEG }
            );
            base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
          } catch {
            // resize failed, fall back to reading raw file directly
            try {
              base64 = await FileSystem.readAsStringAsync(rawResult.uri, { encoding: 'base64' });
            } catch {
              // base64 read failed, but we still have the raw file saved
            }
          }
          return { base64, uri: rawResult.uri };
        }
        // RAW failed — fall through to JPEG silently
      }

      // Standard JPEG capture via expo-camera
      const photo = await cameraRef.current.takePictureAsync({
        quality: compress,
      });
      if (!photo?.uri) return null;
      const originalUri = photo.uri;
      await new Promise(resolve => setTimeout(resolve, 200));

      let base64 = '';
      try {
        const resized = await manipulateAsync(
          originalUri,
          [{ resize: { width: resizeWidth } }],
          { compress, format: SaveFormat.JPEG }
        );
        logger.for('takePicture').debug('resized:', resized.uri, resized.width, 'x', resized.height);
        base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
        logger.for('takePicture').debug('resized base64 length:', base64.length);
      } catch (e) {
        logger.for('takePicture').warn('resize failed, using original:', e);
      }

      if (!base64 || base64.length < 1000) {
        logger.for('takePicture').debug('reading from original photo.uri');
        base64 = await FileSystem.readAsStringAsync(originalUri, { encoding: 'base64' });
        logger.for('takePicture').debug('original base64 length:', base64.length);
      }

      if (!base64 || base64.length < 1000) return null;
      return { base64, uri: originalUri };
    } catch {
      return null;
    }
  }, [cameraReady, cameraRef]);

  const runAnalysis = useCallback(async (base64: string, extraPrompt?: string) => {
    textBufferRef.current = '';
    onSuggestionsChange([]);
    onLoadingChange(true);

    const config = await loadApiConfig();
    if (!config) {
      onLoadingChange(false);
      Alert.alert('请先在设置中配置API');
      return;
    }

    try {
      if (config.apiType === 'minimax') {
        await analyzeImageAnthropic(
          base64,
          config.apiKey,
          config.model,
          (chunk) => {
            const { done, remaining } = parseSuggestions(textBufferRef.current, chunk);
            textBufferRef.current = remaining;
            if (done.length > 0) {
              onSuggestionsChange(prev => {
                const baseId = prev.length;
                const newSuggestions = [...prev, ...done];
                const newKeypoints: Keypoint[] = [];
                done.forEach((text, idx) => {
                  const kp = bubbleTextToKeypoint(text, baseId + idx);
                  if (kp) newKeypoints.push(kp);
                });
                if (newKeypoints.length > 0) {
                  onKeypointsChange(newKeypoints);
                  onShowKeypointsChange(true);
                }
                return newSuggestions;
              });
            }
          },
          extraPrompt,
        );
        if (textBufferRef.current.trim()) {
          onSuggestionsChange(prev => {
            const newText = textBufferRef.current.trim();
            const newSuggestions = [...prev, newText];
            const kp = bubbleTextToKeypoint(newText, newSuggestions.length - 1);
            if (kp) {
              onKeypointsChange(prevKps => [...prevKps, kp]);
              onShowKeypointsChange(true);
            }
            return newSuggestions;
          });
        }
        onLoadingChange(false);
      } else {
        await streamChatCompletion(
          config.apiKey,
          config.baseUrl,
          config.model,
          base64,
          (chunk, done) => {
            if (done) {
              if (textBufferRef.current.trim()) {
                onSuggestionsChange(prev => {
                  const newText = textBufferRef.current.trim();
                  const newSuggestions = [...prev, newText];
                  const kp = bubbleTextToKeypoint(newText, newSuggestions.length - 1);
                  if (kp) {
                    onKeypointsChange(prevKps => [...prevKps, kp]);
                    onShowKeypointsChange(true);
                  }
                  return newSuggestions;
                });
              }
              onLoadingChange(false);
            } else {
              const { done: doneParts, remaining } = parseSuggestions(textBufferRef.current, chunk);
              textBufferRef.current = remaining;
              if (doneParts.length > 0) {
                onSuggestionsChange(prev => {
                  const baseId = prev.length;
                  const newSuggestions = [...prev, ...doneParts];
                  const newKeypoints = doneParts
                    .map((text, idx) => bubbleTextToKeypoint(text, baseId + idx))
                    .filter((kp): kp is Keypoint => kp !== null);
                  if (newKeypoints.length > 0) {
                    onKeypointsChange(prevKps => [...prevKps, ...newKeypoints]);
                    onShowKeypointsChange(true);
                  }
                  return newSuggestions;
                });
              }
            }
          },
          extraPrompt,
        );
      }
    } catch (err: unknown) {
      onLoadingChange(false);
      const msg = err instanceof Error ? err.message : String(err);
      onSuggestionsChange([`错误: ${msg}`]);
    }
  }, [onKeypointsChange, onLoadingChange, onShowKeypointsChange, onSuggestionsChange]);

  const savePhotoToGallery = useCallback(async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const settings = await loadAppSettings();
        const { resizeWidth, compress } = getImageQualitySettings(settings.imageQualityPreset);
        const manipulated = await manipulateAsync(
          uri,
          [{ resize: { width: resizeWidth } }],
          { compress, format: SaveFormat.JPEG }
        );
        await MediaLibrary.saveToLibraryAsync(manipulated.uri);
      }
    } catch (e) {
      logger.for('savePhotoToGallery').warn('failed:', e);
    }
  }, []);

  const capturePreviewFrame = useCallback(async (): Promise<{ base64: string; uri: string } | null> => {
    if (!cameraRef.current || !cameraReady) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.4 });
      if (!photo?.uri) return null;
      const resized = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 480 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );
      const base64 = await FileSystem.readAsStringAsync(resized.uri, { encoding: 'base64' });
      if (base64.length < 500) return null;
      return { base64, uri: resized.uri };
    } catch {
      return null;
    }
  }, [cameraReady, cameraRef]);

  return { takePicture, runAnalysis, savePhotoToGallery, supportsRawCapture, capturePreviewFrame };
}

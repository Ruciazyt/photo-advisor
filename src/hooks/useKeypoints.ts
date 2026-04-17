/**
 * useKeypoints — manages Keypoint[] state derived from AI suggestion strings.
 *
 * Responsibilities:
 * - Parse raw suggestion strings into structured Keypoint objects
 * - Keep keypoint visibility in sync with suggestions
 * - Handle per-keypoint and bulk dismiss
 */

import React, { useState, useCallback, useRef } from 'react';
import type { Keypoint } from '../types';

// Shared parsing utilities — single source of truth
import { parseKeypointFromText } from '../utils/parsing';

// Re-export for callers that import from useKeypoints
export { parseKeypointFromText };

export interface UseKeypointsOptions {
  /** Called when keypoint list changes (e.g. to show overlay) */
  onVisibilityChange?: (visible: boolean) => void;
}

export interface UseKeypointsReturn {
  keypoints: Keypoint[];
  showKeypoints: boolean;
  setKeypoints: React.Dispatch<React.SetStateAction<Keypoint[]>>;
  setShowKeypoints: (v: boolean) => void;
  handleDismiss: (id: number) => void;
  handleDismissAll: () => void;
  /** Derive keypoints from raw suggestion strings (same logic as bubbleTextToKeypoint) */
  deriveKeypoints: (suggestions: string[]) => void;
}

// Position detection from label text
export function useKeypoints({ onVisibilityChange }: UseKeypointsOptions = {}): UseKeypointsReturn {
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [showKeypoints, setShowKeypointsInternal] = useState(false);
  const nextIdRef = useRef(0);

  const setShowKeypoints = useCallback((v: boolean) => {
    setShowKeypointsInternal(v);
    onVisibilityChange?.(v);
  }, [onVisibilityChange]);

  /** Replace current keypoints with parsed versions of the given suggestions array */
  const deriveKeypoints = useCallback((suggestions: string[]) => {
    const parsed: Keypoint[] = [];
    let id = nextIdRef.current;

    for (const text of suggestions) {
      if (!text.trim()) continue;
      const kp = parseKeypointFromText(text, id);
      if (kp) {
        parsed.push(kp);
        id++;
      }
    }

    nextIdRef.current = id;
    setKeypoints(parsed);
    if (parsed.length > 0) {
      setShowKeypointsInternal(true);
      onVisibilityChange?.(true);
    }
  }, [onVisibilityChange]);

  const handleDismiss = useCallback((id: number) => {
    setKeypoints(prev => {
      const next = prev.filter(kp => kp.id !== id);
      if (next.length === 0) {
        setShowKeypointsInternal(false);
        onVisibilityChange?.(false);
      }
      return next;
    });
  }, [onVisibilityChange]);

  const handleDismissAll = useCallback(() => {
    setKeypoints([]);
    setShowKeypointsInternal(false);
    onVisibilityChange?.(false);
  }, [onVisibilityChange]);

  return {
    keypoints,
    showKeypoints,
    setKeypoints,
    setShowKeypoints,
    handleDismiss,
    handleDismissAll,
    deriveKeypoints,
  };
}

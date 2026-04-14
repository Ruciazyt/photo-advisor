/**
 * useKeypoints — manages Keypoint[] state derived from AI suggestion strings.
 *
 * Responsibilities:
 * - Parse raw suggestion strings into structured Keypoint objects
 * - Keep keypoint visibility in sync with suggestions
 * - Handle per-keypoint and bulk dismiss
 */

import React, { useState, useCallback, useRef } from 'react';
import type { Keypoint, KeypointPosition } from '../types';

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
const POSITION_MAP: Record<string, KeypointPosition> = {
  '左上': 'top-left',
  '右上': 'top-right',
  '左下': 'bottom-left',
  '右下': 'bottom-right',
  '中间': 'center',
};

const ROUND_ROBIN: KeypointPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];

function labelToPosition(label: string): KeypointPosition {
  for (const [tag, pos] of Object.entries(POSITION_MAP)) {
    if (label.includes(tag)) return pos;
  }
  return 'center';
}

/** Parse a raw AI suggestion string into a Keypoint (mirrors bubbleTextToKeypoint in KeypointOverlay) */
export function parseKeypointFromText(text: string, id: number): Keypoint | null {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return null;

  const label = match[1].trim();
  const instruction = match[2].trim();
  const position = labelToPosition(label);

  return { id, label, position, instruction: instruction || undefined };
}

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

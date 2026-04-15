import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AccessibilityProps, AccessibilityState } from 'react-native';

/**
 * Announces a message to screen readers (VoiceOver/TalkBack).
 * @param message - The message to announce
 * @param politeness - 'polite' (waits for current announcement) or 'assertive' (interrupts)
 */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Hook that provides screen reader announcement functionality and screen reader status.
 * @returns {{ announce: (message: string, politeness?: 'polite' | 'assertive') => void, isScreenReaderEnabled: boolean }}
 */
export function useAccessibilityAnnouncement(): {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
  isScreenReaderEnabled: boolean;
} {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  const announce = useCallback((message: string, _politeness?: 'polite' | 'assertive') => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setIsScreenReaderEnabled);
    return () => sub.remove();
  }, []);

  return { announce, isScreenReaderEnabled };
}

/**
 * Hook that detects the system "Reduce Motion" preference.
 * @returns {{ reducedMotion: boolean }}
 */
export function useAccessibilityReducedMotion(): { reducedMotion: boolean } {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  return { reducedMotion };
}

/**
 * Returns accessibility props for a TouchableOpacity button.
 * Adds screen-reader labels, hints, and role based on context.
 */
export function useAccessibilityButton(opts: {
  label: string;
  hint?: string;
  enabled?: boolean;
  /** 'button' | 'menuitem' | 'tab' | 'adjustable' */
  role?: AccessibilityProps['accessibilityRole'];
}): Record<string, unknown> {
  const { label, hint, enabled = true, role = 'button' } = opts;

  const accessibilityState: AccessibilityState = {
    disabled: !enabled,
  };

  const props: Record<string, unknown> = {
    accessibilityLabel: label,
    accessibilityRole: role,
    accessibilityState,
  };

  if (hint) {
    props.accessibilityHint = hint;
  }

  return props;
}

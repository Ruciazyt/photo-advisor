import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAnimationFrameTimer } from '../hooks/useAnimationFrameTimer';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../contexts/ThemeContext';
import { FocusZoneButton } from './FocusZoneButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { FocusGuideOverlayProps } from '../types';
export type { FocusGuideOverlayProps };

// Focus zone depth approximations (0 = near, 1 = far/infinity)
// These are heuristics since expo-camera focusDepth support varies by device
export const FOCUS_ZONES = [
  { label: '远景', sub: '∞', depth: 0.95, description: '风景/建筑' },
  { label: '标准', sub: '~3m', depth: 0.5, description: '人文/抓拍' },
  { label: '近拍', sub: '~0.5m', depth: 0.1, description: '微距/特写' },
] as const;

const DOF_WARNING_ZOOM = 2.0;
const ZOOM_POLL_INTERVAL_MS = 300;

interface FocusRingProps {
  x: number;
  y: number;
  borderColor: string;
  innerBorderColor: string;
  onComplete: () => void;
}

function FocusRing({ x, y, borderColor, innerBorderColor, onComplete }: FocusRingProps) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    // Both animations run simultaneously on the UI thread — no JS thread needed.
    // Wrap onComplete in runOnJS since it's a host function (state setter).
    scale.value = withTiming(1.8, { duration: 500 });
    // NOTE: onEnd callback fires on the UI thread (not the JS thread).
    // This is intentional — it means onComplete runs without a JS→UI round-trip,
    // providing smoother animation completion with no frame drops.
    opacity.value = withTiming(0, { duration: 500 }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.focusRing,
        {
          left: x - 30,
          top: y - 30,
          borderColor,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.focusRingInner, { borderColor: innerBorderColor }]} />
    </Animated.View>
  );
}

export function FocusGuideOverlay({ visible, cameraRef, showToast }: FocusGuideOverlayProps) {
  const { colors } = useTheme();

  // Build theme-aware styles — recomputed when colors change (e.g. light/dark switch)
  const dynamicStyles = useMemo(() => {
    const c = colors;
    return StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 15,
      },
      zoomIndicator: {
        position: 'absolute',
        top: 60,
        right: 16,
        backgroundColor: c.cardBg,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: c.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      },
      zoomLabel: {
        color: c.textSecondary,
        fontSize: 11,
        fontWeight: '600',
      },
      zoomValue: {
        color: c.text,
        fontSize: 13,
        fontWeight: '800',
      },
      dofWarning: {
        position: 'absolute',
        top: 60,
        left: '50%',
        marginLeft: -50,
        backgroundColor: c.warning + 'BF',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: c.warning + '80',
      },
      dofWarningText: {
        color: c.text,
        fontSize: 12,
        fontWeight: '700',
      },
      zoneButtonsContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
      },
      zoneButton: {
        backgroundColor: c.cardBg,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        minWidth: 80,
      },
      zoneButtonLabel: {
        color: c.text,
        fontSize: 14,
        fontWeight: '700',
      },
      zoneButtonSub: {
        color: c.textSecondary,
        fontSize: 10,
        fontWeight: '500',
        marginTop: 1,
      },
      focusRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      },
      focusRingInner: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
      },
    });
  }, [colors]);

  // Zoom level is tracked from periodic polling since CameraView.zoom is read-only
  // Read initial zoom synchronously from cameraRef (safe: ref is always current)
  const initialZoom = cameraRef.current
    ? (cameraRef.current as any).zoom ?? 1.0
    : 1.0;
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  // Active focus rings from tap-to-focus
  const [focusRings, setFocusRings] = useState<{ id: number; x: number; y: number }[]>([]);
  const ringCounterRef = useRef(0);
  const mountedRef = useRef(true);

  // Poll camera zoom value periodically using UI-thread timer
  const poll = useCallback(() => {
    // Guard: don't update state if component has unmounted
    if (!mountedRef.current) return;
    if (cameraRef.current) {
      // Try to read zoom from camera ref (expo-camera may expose it)
      const cam = cameraRef.current as any;
      if (cam.zoom !== undefined && typeof cam.zoom === 'number') {
        setZoomLevel(cam.zoom);
      }
    }
  }, [cameraRef]);

  useAnimationFrameTimer({
    intervalMs: ZOOM_POLL_INTERVAL_MS,
    onTick: poll,
    enabled: visible,
  });

  const { mediumImpact, errorNotification, warningNotification } = useHaptics();

  const handleFocusZonePress = useCallback(
    (zone: (typeof FOCUS_ZONES)[number]) => {
      if (!cameraRef.current) return;
      const cam = cameraRef.current as any;

      if (typeof cam.focusDepth === 'function') {
        try {
          cam.focusDepth(zone.depth);
          mediumImpact();
        } catch {
          showToast?.('对焦失败，请重试');
          errorNotification();
        }
      } else {
        showToast?.('当前设备不支持手动对焦');
        warningNotification();
      }
    },
    [cameraRef, mediumImpact, errorNotification, warningNotification]
  );

  const handleTapToFocus = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = event.nativeEvent;
      const id = ++ringCounterRef.current;
      setFocusRings(prev => [...prev, { id, x: locationX, y: locationY }]);
    },
    []
  );

  const removeRing = useCallback((id: number) => {
    setFocusRings(prev => prev.filter(r => r.id !== id));
  }, []);

  const ringBorderColor = colors.sunColor + 'E6';
  const ringInnerBorderColor = colors.sunColor + '99';

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={handleTapToFocus}>
      <View style={dynamicStyles.container} pointerEvents="box-none">
        {/* Zoom indicator — top right */}
        <View style={dynamicStyles.zoomIndicator}>
          <Text style={dynamicStyles.zoomLabel}>变焦</Text>
          <Text style={dynamicStyles.zoomValue}>{zoomLevel.toFixed(1)}x</Text>
        </View>

        {/* DOF warning — shown when zoom >= 2x */}
        {zoomLevel >= DOF_WARNING_ZOOM && (
          <View style={dynamicStyles.dofWarning}>
            <Text style={dynamicStyles.dofWarningText}>⚠️ DOF变浅</Text>
          </View>
        )}

        {/* Focus zone buttons — bottom area */}
        <View style={dynamicStyles.zoneButtonsContainer}>
          {FOCUS_ZONES.map(zone => (
            <FocusZoneButton
              key={zone.label}
              zone={zone}
              style={dynamicStyles.zoneButton}
              labelStyle={dynamicStyles.zoneButtonLabel}
              subStyle={dynamicStyles.zoneButtonSub}
              onPress={() => handleFocusZonePress(zone)}
            />
          ))}
        </View>

        {/* Focus ring feedback */}
        {focusRings.map(ring => (
          <FocusRing
            key={ring.id}
            x={ring.x}
            y={ring.y}
            borderColor={ringBorderColor}
            innerBorderColor={ringInnerBorderColor}
            onComplete={() => removeRing(ring.id)}
          />
        ))}
      </View>
    </TouchableWithoutFeedback>
  );
}

// Static styles (no theme dependency — used by FocusRing which receives colors as props)
const styles = StyleSheet.create({
  focusRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRingInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
});

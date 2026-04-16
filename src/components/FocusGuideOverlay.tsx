import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  ToastAndroid,
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
const FOCUS_ZONES = [
  { label: '远景', sub: '∞', depth: 0.95, description: '风景/建筑' },
  { label: '标准', sub: '~3m', depth: 0.5, description: '人文/抓拍' },
  { label: '近拍', sub: '~0.5m', depth: 0.1, description: '微距/特写' },
] as const;

const DOF_WARNING_ZOOM = 2.0;
const ZOOM_POLL_INTERVAL_MS = 300;

interface FocusRingProps {
  x: number;
  y: number;
  onComplete: () => void;
}

function FocusRing({ x, y, onComplete }: FocusRingProps) {
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
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.focusRingInner} />
    </Animated.View>
  );
}

export function FocusGuideOverlay({ visible, cameraRef }: FocusGuideOverlayProps) {
  // Zoom level is tracked from periodic polling since CameraView.zoom is read-only
  const [zoomLevel, setZoomLevel] = useState(1.0);
  // Tracks whether the current device supports focusDepth
  const [focusDepthSupported, setFocusDepthSupported] = useState<boolean | null>(null);
  // Active focus rings from tap-to-focus
  const [focusRings, setFocusRings] = useState<{ id: number; x: number; y: number }[]>([]);
  const ringCounterRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll camera zoom value periodically
  useEffect(() => {
    if (!visible) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const poll = () => {
      if (cameraRef.current) {
        // Try to read zoom from camera ref (expo-camera may expose it)
        const cam = cameraRef.current as any;
        if (cam.zoom !== undefined && typeof cam.zoom === 'number') {
          setZoomLevel(cam.zoom);
        }
        // Check if focusDepth method is available once
        if (focusDepthSupported === null && typeof cam.focusDepth === 'function') {
          setFocusDepthSupported(true);
        } else if (focusDepthSupported === null) {
          setFocusDepthSupported(false);
        }
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, ZOOM_POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleFocusZonePress = useCallback(
    (zone: (typeof FOCUS_ZONES)[number]) => {
      if (!cameraRef.current) return;
      const cam = cameraRef.current as any;

      if (typeof cam.focusDepth === 'function') {
        try {
          cam.focusDepth(zone.depth);
        } catch {
          showToast('对焦失败，请重试');
        }
      } else {
        showToast('当前设备不支持手动对焦');
      }
    },
    [cameraRef]
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

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    }
    // On iOS or other platforms, skip toast silently since we don't have a toast library wired up
    // The buttons themselves provide feedback
  };

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={handleTapToFocus}>
      <View style={styles.container} pointerEvents="box-none">
        {/* Zoom indicator — top right */}
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomLabel}>变焦</Text>
          <Text style={styles.zoomValue}>{zoomLevel.toFixed(1)}x</Text>
        </View>

        {/* DOF warning — shown when zoom >= 2x */}
        {zoomLevel >= DOF_WARNING_ZOOM && (
          <View style={styles.dofWarning}>
            <Text style={styles.dofWarningText}>⚠️ DOF变浅</Text>
          </View>
        )}

        {/* Focus zone buttons — bottom area */}
        <View style={styles.zoneButtonsContainer}>
          {FOCUS_ZONES.map(zone => (
            <TouchableOpacity
              key={zone.label}
              style={styles.zoneButton}
              onPress={() => handleFocusZonePress(zone)}
              activeOpacity={0.7}
            >
              <Text style={styles.zoneButtonLabel}>{zone.label}</Text>
              <Text style={styles.zoneButtonSub}>{zone.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Focus ring feedback */}
        {focusRings.map(ring => (
          <FocusRing
            key={ring.id}
            x={ring.x}
            y={ring.y}
            onComplete={() => removeRing(ring.id)}
          />
        ))}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  zoomIndicator: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  zoomLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  zoomValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  dofWarning: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -50,
    backgroundColor: 'rgba(255,100,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.5)',
  },
  dofWarningText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    minWidth: 80,
  },
  zoneButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  zoneButtonSub: {
    color: 'rgba(255,255,255,0.5)',
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
    borderColor: 'rgba(255,220,0,0.9)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRingInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,220,0,0.6)',
  },
});

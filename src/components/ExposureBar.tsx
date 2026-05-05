import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityReducedMotion } from '../hooks/useAccessibility';

const BAR_PADDING_HORIZONTAL = 16;
const THUMB_SIZE = 24;
const BAR_HEIGHT = 8;
const FULL_WIDTH = Dimensions.get('window').width - 32;

interface ExposureBarProps {
  visible: boolean;
  exposureComp: number;
  minEC: number;
  maxEC: number;
  onExposureChange: (value: number) => void;
  onExposureChangeEnd?: (value: number) => void;
}

export function ExposureBar({
  visible,
  exposureComp,
  minEC,
  maxEC,
  onExposureChange,
  onExposureChangeEnd,
}: ExposureBarProps) {
  const { colors } = useTheme();
  const { reducedMotion } = useAccessibilityReducedMotion();
  const animatedOpacity = useSharedValue(0);

  // Track position for drag
  const layoutRef = useRef({ x: 0, width: FULL_WIDTH });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: reducedMotion ? 0 : 200 }),
  }));

  // Compute thumb position from exposure value
  const valueToPosition = useCallback(
    (val: number) => {
      const range = maxEC - minEC;
      if (range === 0) return layoutRef.current.width / 2;
      return ((val - minEC) / range) * layoutRef.current.width;
    },
    [minEC, maxEC]
  );

  const positionToValue = useCallback(
    (pos: number) => {
      const range = maxEC - minEC;
      if (layoutRef.current.width === 0) return 0;
      const raw = (pos / layoutRef.current.width) * range + minEC;
      return Math.round(raw * 10) / 10;
    },
    [minEC, maxEC]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_event, gestureState) => {
          const barX = layoutRef.current.x;
          const barWidth = layoutRef.current.width;
          const rawPos = Math.max(0, Math.min(barWidth, gestureState.moveX - barX));
          const newValue = positionToValue(rawPos);
          onExposureChange(newValue);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const barX = layoutRef.current.x;
          const barWidth = layoutRef.current.width;
          const rawPos = Math.max(0, Math.min(barWidth, gestureState.moveX - barX));
          const finalValue = positionToValue(rawPos);
          onExposureChangeEnd?.(finalValue);
        },
      }),
    [onExposureChange, onExposureChangeEnd, positionToValue]
  );

  const dynamicStyles = useMemo(() => {
    const c = colors;
    return StyleSheet.create({
      container: {
        position: 'absolute',
        top: 120,
        left: 16,
        right: 16,
        zIndex: 18,
        backgroundColor: c.cardBg,
        borderRadius: 16,
        paddingHorizontal: BAR_PADDING_HORIZONTAL,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: c.border,
      },
      label: {
        color: c.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
      },
      barContainer: {
        height: THUMB_SIZE,
        justifyContent: 'center',
      },
      track: {
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        backgroundColor: c.border,
        overflow: 'visible',
      },
      fill: {
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        backgroundColor: c.accent,
        position: 'absolute',
        left: 0,
        top: 0,
      },
      thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: c.accent,
        top: -(THUMB_SIZE - BAR_HEIGHT) / 2,
        borderWidth: 2,
        borderColor: c.cardBg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
      },
      tickRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingHorizontal: THUMB_SIZE / 2 - 6,
      },
      tickLabel: {
        color: c.textSecondary,
        fontSize: 10,
        fontWeight: '500',
      },
      valueLabel: {
        color: c.text,
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 6,
      },
    });
  }, [colors]);

  const thumbPosition = valueToPosition(exposureComp);
  const fillWidth = thumbPosition;
  const centered = valueToPosition(0) - THUMB_SIZE / 2;

  if (!visible) return null;

  return (
    <Animated.View
      style={[dynamicStyles.container, animatedStyle]}
      pointerEvents="box-none"
      onLayout={(e) => {
        layoutRef.current.width = e.nativeEvent.layout.width - 2 * BAR_PADDING_HORIZONTAL;
      }}
      {...panResponder.panHandlers}
    >
      <Text style={dynamicStyles.label}>曝光补偿 (EV)</Text>
      <View style={dynamicStyles.barContainer}>
        <View style={dynamicStyles.track}>
          <View style={[dynamicStyles.fill, { width: fillWidth }]} />
        </View>
        <View
          style={[
            dynamicStyles.thumb,
            { left: thumbPosition - THUMB_SIZE / 2 },
          ]}
        />
      </View>
      <View style={dynamicStyles.tickRow}>
        <Text style={dynamicStyles.tickLabel}>{minEC.toFixed(1)}</Text>
        <Text style={dynamicStyles.tickLabel}>0</Text>
        <Text style={dynamicStyles.tickLabel}>{maxEC.toFixed(1)}</Text>
      </View>
      <Text style={dynamicStyles.valueLabel}>{exposureComp >= 0 ? `+${exposureComp.toFixed(1)}` : exposureComp.toFixed(1)} EV</Text>
    </Animated.View>
  );
}
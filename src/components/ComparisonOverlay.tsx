import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { KeypointOverlay } from './KeypointOverlay';
import { BubbleOverlay } from './BubbleOverlay';
import { useTheme } from '../contexts/ThemeContext';
import type { BubbleItem, Keypoint, ComparisonOverlayProps } from '../types';
export type { ComparisonOverlayProps };

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Module-level static styles
const staticStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.75,
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  toggleBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#000',
  },
  scoreContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  starsText: {
    fontSize: 16,
  },
});

export function ComparisonOverlay({
  imageUri,
  keypoints,
  bubbles,
  visible,
  onClose,
  score,
  scoreReason,
}: ComparisonOverlayProps) {
  const { colors } = useTheme();
  const [showAnnotated, setShowAnnotated] = useState(true);
  const fadeAnim = useSharedValue(1);

  // Build theme-aware styles
  const dynamicStyles = useMemo(() => {
    const c = colors;
    return StyleSheet.create({
      container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.primary,
        zIndex: 100,
      },
      closeBtn: {
        backgroundColor: c.cardBg + '8F',
        borderColor: c.border + '33',
      },
      closeBtnText: {
        color: c.text,
      },
      toggleContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
      },
      toggleBtn: {
        backgroundColor: c.cardBg + '99',
        borderColor: c.border + '33',
      },
      toggleText: {
        color: c.textSecondary,
      },
      scoreContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: c.cardBg + '8F',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: c.border + '26',
      },
      imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      image: {
        width: SCREEN_W,
        height: SCREEN_H * 0.75,
      },
      controls: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        pointerEvents: 'box-none',
      },
      toggleTextActive: {
        color: c.text,
      },
      scoreBadge: {
        color: c.text,
        fontSize: 14,
        fontWeight: '700',
      },
      scoreReasonSmall: {
        color: c.textSecondary,
        fontSize: 11,
        maxWidth: 120,
      },
    });
  }, [colors]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  const toggleView = useCallback((show: boolean) => {
    fadeAnim.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(setShowAnnotated)(show);
        fadeAnim.value = withTiming(1, { duration: 150 });
      }
    });
  }, []);

  if (!visible) return null;

  // In comparison mode we don't need dismiss actions
  const noop = (_id: number) => {};
  const noopAll = () => {};

  return (
    <View style={dynamicStyles.container}>
      {/* Image */}
      <Animated.View style={[dynamicStyles.imageContainer, animatedStyle]}>
        <Image source={{ uri: imageUri }} style={dynamicStyles.image} resizeMode="contain" />
        {showAnnotated && (
          <>
            <KeypointOverlay keypoints={keypoints} visible={true} />
            <BubbleOverlay
              visibleItems={bubbles ?? []}
              loading={false}
              onDismiss={noop}
              onDismissAll={noopAll}
            />
          </>
        )}
      </Animated.View>

      {/* Controls overlay */}
      <View style={dynamicStyles.controls} pointerEvents="box-none">
        {/* Close button */}
        <TouchableOpacity style={dynamicStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={dynamicStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Top score display */}
        {score !== undefined && (
          <View style={dynamicStyles.scoreContainer}>
            <Text style={[staticStyles.starsText, { color: colors.accent }]}>
              {'★'.repeat(score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1)}
              {'☆'.repeat(score >= 90 ? 0 : score >= 75 ? 1 : score >= 60 ? 2 : score >= 40 ? 3 : 4)}
            </Text>
            <Text style={dynamicStyles.scoreBadge}>{score}分</Text>
            {scoreReason ? <Text style={dynamicStyles.scoreReasonSmall}>{scoreReason}</Text> : null}
          </View>
        )}

        {/* Bottom toggle */}
        <View style={dynamicStyles.toggleContainer}>
          <TouchableOpacity
            style={[dynamicStyles.toggleBtn, !showAnnotated && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => toggleView(false)}
            activeOpacity={0.8}
          >
            <Text style={[dynamicStyles.toggleText, !showAnnotated && dynamicStyles.toggleTextActive]}>
              📷 原图
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dynamicStyles.toggleBtn, showAnnotated && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => toggleView(true)}
            activeOpacity={0.8}
          >
            <Text style={[dynamicStyles.toggleText, showAnnotated && dynamicStyles.toggleTextActive]}>
              ✨ AI 标注
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

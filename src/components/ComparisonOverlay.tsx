import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
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
    backgroundColor: '#000',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnText: {
    color: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  starsText: {
    fontSize: 16,
  },
  scoreBadge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreReasonSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    maxWidth: 120,
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
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const toggleView = (show: boolean) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setShowAnnotated(show);
  };

  if (!visible) return null;

  // In comparison mode we don't need dismiss actions
  const noop = (_id: number) => {};
  const noopAll = () => {};

  return (
    <View style={staticStyles.container}>
      {/* Image */}
      <Animated.View style={[staticStyles.imageContainer, { opacity: fadeAnim }]}>
        <Image source={{ uri: imageUri }} style={staticStyles.image} resizeMode="contain" />
        {showAnnotated && (
          <>
            <KeypointOverlay keypoints={keypoints} visible={true} />
            <BubbleOverlay
              items={bubbles}
              loading={false}
              onDismiss={noop}
              onDismissAll={noopAll}
            />
          </>
        )}
      </Animated.View>

      {/* Controls overlay */}
      <View style={staticStyles.controls} pointerEvents="box-none">
        {/* Close button */}
        <TouchableOpacity style={staticStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={staticStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Top score display */}
        {score !== undefined && (
          <View style={staticStyles.scoreContainer}>
            <Text style={[staticStyles.starsText, { color: colors.accent }]}>
              {'★'.repeat(score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1)}
              {'☆'.repeat(score >= 90 ? 0 : score >= 75 ? 1 : score >= 60 ? 2 : score >= 40 ? 3 : 4)}
            </Text>
            <Text style={staticStyles.scoreBadge}>{score}分</Text>
            {scoreReason ? <Text style={staticStyles.scoreReasonSmall}>{scoreReason}</Text> : null}
          </View>
        )}

        {/* Bottom toggle */}
        <View style={staticStyles.toggleContainer}>
          <TouchableOpacity
            style={[staticStyles.toggleBtn, !showAnnotated && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => toggleView(false)}
            activeOpacity={0.8}
          >
            <Text style={[staticStyles.toggleText, !showAnnotated && staticStyles.toggleTextActive]}>
              📷 原图
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[staticStyles.toggleBtn, showAnnotated && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => toggleView(true)}
            activeOpacity={0.8}
          >
            <Text style={[staticStyles.toggleText, showAnnotated && staticStyles.toggleTextActive]}>
              ✨ AI 标注
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

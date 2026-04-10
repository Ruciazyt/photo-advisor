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
import { BubbleOverlay, BubbleItem } from './BubbleOverlay';
import { Keypoint } from './KeypointOverlay';
import { Colors } from '../constants/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ComparisonOverlayProps {
  imageUri: string;
  keypoints: Keypoint[];
  bubbles: BubbleItem[];
  visible: boolean;
  onClose: () => void;
}

export function ComparisonOverlay({
  imageUri,
  keypoints,
  bubbles,
  visible,
  onClose,
}: ComparisonOverlayProps) {
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
    <View style={styles.container}>
      {/* Image */}
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
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
      <View style={styles.controls} pointerEvents="box-none">
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Bottom toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, !showAnnotated && styles.toggleBtnActive]}
            onPress={() => toggleView(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, !showAnnotated && styles.toggleTextActive]}>
              📷 原图
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, showAnnotated && styles.toggleBtnActive]}
            onPress={() => toggleView(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, showAnnotated && styles.toggleTextActive]}>
              ✨ AI 标注
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  toggleBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  toggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#000',
  },
});

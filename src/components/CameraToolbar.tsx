import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityButton } from '../hooks/useAccessibility';

interface CameraToolbarProps {
  onGallery: () => void;
  onAskAI: () => void;
  onSwitchCamera: () => void;
}

export function CameraToolbar({ onGallery, onAskAI, onSwitchCamera }: CameraToolbarProps) {
  const { colors } = useTheme();

  const galleryA11y = useAccessibilityButton({
    label: '相册',
    hint: '打开相册查看照片',
    role: 'button',
  });

  const askAIA11y = useAccessibilityButton({
    label: 'AI摄影',
    hint: '点击拍摄照片',
    role: 'button',
  });

  const switchCameraA11y = useAccessibilityButton({
    label: '切换摄像头',
    hint: '切换前后摄像头',
    role: 'button',
  });

  const styles = useMemo(() => StyleSheet.create({
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 12,
      paddingTop: 20,
      backgroundColor: colors.overlayBg,
    },
    toolBtn: {
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: colors.border,
    },
    captureBtnInner: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: colors.background,
    },
  }), [colors]);

  return (
    <View style={styles.toolbar}>
      {/* Left: Gallery */}
      <TouchableOpacity
        style={styles.toolBtn}
        onPress={onGallery}
        activeOpacity={0.7}
        {...galleryA11y}
      >
        <Ionicons name="images-outline" size={28} color={colors.text} />
      </TouchableOpacity>

      {/* Center: Ask AI */}
      <TouchableOpacity
        style={styles.captureBtn}
        onPress={onAskAI}
        activeOpacity={0.7}
        {...askAIA11y}
      >
        <View style={styles.captureBtnInner} />
      </TouchableOpacity>

      {/* Right: Switch Camera */}
      <TouchableOpacity
        style={styles.toolBtn}
        onPress={onSwitchCamera}
        activeOpacity={0.7}
        {...switchCameraA11y}
      >
        <Ionicons name="camera-reverse-outline" size={28} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { sharePhoto } from '../services/share';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { ShareOptions } from '../types';

interface ShareButtonProps {
  /** Local URI of the last captured photo */
  photoUri: string;
  /** AI composition suggestions from current session */
  suggestions: string[];
  /** Grid type label */
  gridType: string;
  /** Composition score 0-100 */
  score?: number;
  /** Grid variant key for icon */
  gridVariant?: string;
  /** Callback when share completes */
  onShareEnd?: () => void;
}

// Module-level static styles
const staticStyles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  toast: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 30,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

/** Animated toast for share result — driven entirely on the UI thread via Reanimated */
function ShareToast({ message, visible, onHidden }: { message: string; visible: boolean; onHidden?: () => void }) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      // Fade in → hold 1500ms → fade out, all on UI thread
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1500, withTiming(0, { duration: 200 }, (finished) => {
          if (finished && onHidden) {
            runOnJS(onHidden)();
          }
        }))
      );
    } else {
      opacity.value = withTiming(0, { duration: 100 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible) return null;

  return (
    <Animated.View style={[staticStyles.toast, animatedStyle]} pointerEvents="none">
      <Text style={staticStyles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export function ShareButton({
  photoUri,
  suggestions,
  gridType,
  score,
  gridVariant,
  onShareEnd,
}: ShareButtonProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const canShare = !!photoUri;

  const shareA11y = useAccessibilityButton({
    label: '分享',
    hint: canShare ? '分享照片到其他应用' : '拍摄照片后可分享',
    role: 'button',
    enabled: canShare,
  });

  const handleShare = async () => {
    if (sharing || !canShare) return;

    setSharing(true);
    try {
      const opts: ShareOptions = {
        photoUri,
        suggestions,
        gridType,
        score,
        gridVariant,
      };
      const result = await sharePhoto(opts);
      if (result.success) {
        setToastMessage('分享成功！');
      } else {
        setToastMessage(result.error ?? '分享失败');
      }
    } catch {
      setToastMessage('分享失败');
    } finally {
      setSharing(false);
      setShowToast(true);
      // onHidden is called by the Reanimated animation chain after fade-out completes
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[staticStyles.button, !canShare && staticStyles.buttonDisabled]}
        onPress={handleShare}
        disabled={!canShare || sharing}
        activeOpacity={0.7}
        {...shareA11y}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons
            name="share-outline"
            size={18}
            color={canShare ? colors.accent : 'rgba(255,255,255,0.3)'}
          />
        )}
        <Text style={[staticStyles.buttonText, !canShare && staticStyles.buttonTextDisabled, canShare && { color: colors.accent }]}>
          {sharing ? '分享中' : '分享'}
        </Text>
      </TouchableOpacity>

      <ShareToast
        message={toastMessage}
        visible={showToast}
        onHidden={() => {
          setShowToast(false);
          onShareEnd?.();
        }}
      />
    </>
  );
}

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { sharePhoto } from '../services/share';
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

const toastStyles = StyleSheet.create({
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

/** Animated toast for share result */
function ShareToast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[toastStyles.toast, { opacity }]} pointerEvents="none">
      <Text style={toastStyles.toastText}>{message}</Text>
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

  const styles = StyleSheet.create({
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
      color: colors.accent,
      fontSize: 13,
      fontWeight: '600',
    },
    buttonTextDisabled: {
      color: 'rgba(255,255,255,0.3)',
    },
  });

  const canShare = !!photoUri;

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
      setTimeout(() => {
        setShowToast(false);
        onShareEnd?.();
      }, 2000);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, !canShare && styles.buttonDisabled]}
        onPress={handleShare}
        disabled={!canShare || sharing}
        activeOpacity={0.7}
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
        <Text style={[styles.buttonText, !canShare && styles.buttonTextDisabled]}>
          {sharing ? '分享中' : '分享'}
        </Text>
      </TouchableOpacity>

      <ShareToast message={toastMessage} visible={showToast} />
    </>
  );
}

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { sharePhoto } from '../services/share';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import { ShareCard } from './ShareCard';
import { SharePreviewModal } from './SharePreviewModal';
import { captureRef } from 'react-native-view-shot';
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
  /** One-line score reason text (e.g. '主体偏左，建议右移') */
  scoreReason?: string;
  /** Callback when share completes */
  onShareEnd?: () => void;
  /** Aspect ratio of the photo (width/height). Used to correctly size the ShareCard capture. */
  photoAspectRatio?: number;
}

// Module-level static styles (no theme dependency)
const staticStyles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
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
  // ShareCard is rendered off-screen for capture
  offscreenCard: {
    position: 'absolute',
    left: -9999,
    top: 0,
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
  scoreReason,
  onShareEnd,
  photoAspectRatio = 3 / 4,
}: ShareButtonProps) {
  const { colors } = useTheme();
  const [sharing, setSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Share preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [captionText, setCaptionText] = useState('');

  // Pre-fill caption with AI suggestions when modal opens
  const openPreview = () => {
    const prefill = suggestions.length > 0
      ? suggestions.map(s => s.replace(/^\[[^\]]+\]\s*/, '').trim()).join('\n')
      : '';
    setCaptionText(prefill);
    setShowPreview(true);
  };

  // Ref for the off-screen ShareCard used as capture source for view-shot
  const shareCardRef = useRef<View>(null);

  // Track actual photo dimensions to size the ShareCard correctly
  const [cardAspectRatio, setCardAspectRatio] = useState(photoAspectRatio);

  useEffect(() => {
    if (!photoUri) return;
    let cancelled = false;

    const loadAspectRatio = () => {
      // Image.getSize may be callback-based or Promise-based depending on the runtime.
      // Wrap in a Promise so we handle both consistently.
      new Promise<void>((resolve) => {
        try {
          // Image.getSize may return void (callback-based) or a Promise in some RN versions.
          // Cast to `unknown` then check for thenable to handle both cases safely.
          const result = Image.getSize(
            photoUri,
            (width, height) => {
              if (!cancelled) setCardAspectRatio(width / height);
              resolve();
            },
            () => {
              if (!cancelled) setCardAspectRatio(photoAspectRatio);
              resolve();
            },
          ) as unknown;
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<unknown>).then(
              () => {},
              () => {},
            );
          }
        } catch {
          if (!cancelled) setCardAspectRatio(photoAspectRatio);
          resolve();
        }
      });
    };

    loadAspectRatio();
    return () => { cancelled = true; };
  }, [photoUri]);

  const buttonStyles = useMemo(() => StyleSheet.create({
    button: {
      position: 'absolute',
      top: 110,
      left: 16,
      zIndex: 10,
      backgroundColor: colors.shareButtonBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.shareButtonBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    buttonTextDisabled: {
      color: colors.shareButtonDisabledText,
    },
  }), [colors.shareButtonBg, colors.shareButtonBorder, colors.shareButtonDisabledText]);

  const canShare = !!photoUri;

  const shareA11y = useAccessibilityButton({
    label: '分享',
    hint: canShare ? '分享照片到其他应用' : '拍摄照片后可分享',
    role: 'button',
    enabled: canShare,
  });

  const handleShare = () => {
    if (!canShare) return;
    // Open preview modal instead of sharing directly
    openPreview();
  };

  // Called by SharePreviewModal's onShare — does the actual capture + share
  const handlePreviewShare = async (capturedUri: string, caption: string) => {
    setShowPreview(false);
    setSharing(true);
    try {
      const opts: ShareOptions = {
        photoUri: capturedUri,
        suggestions,
        gridType,
        score,
        gridVariant,
        text: caption || undefined,
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
    }
  };

  return (
    <>
      {/* Off-screen ShareCard rendered for view-shot capture */}
      <View ref={shareCardRef} style={staticStyles.offscreenCard} collapsable={false}>
        <ShareCard
          photoUri={photoUri}
          suggestions={suggestions}
          gridType={gridType}
          score={score}
          gridVariant={gridVariant}
          scoreReason={scoreReason}
          photoAspectRatio={cardAspectRatio}
        />
      </View>

      <TouchableOpacity
        style={[buttonStyles.button, !canShare && staticStyles.buttonDisabled]}
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
        <Text style={[staticStyles.buttonText, !canShare && buttonStyles.buttonTextDisabled, canShare && { color: colors.accent }]}>
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

      <SharePreviewModal
        visible={showPreview}
        photoUri={photoUri}
        suggestions={suggestions}
        gridType={gridType}
        score={score}
        gridVariant={gridVariant}
        captionText={captionText}
        onCaptionChange={setCaptionText}
        onShare={handlePreviewShare}
        onCancel={() => setShowPreview(false)}
        photoAspectRatio={cardAspectRatio}
        scoreReason={scoreReason}
      />
    </>
  );
}

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityReducedMotion } from '../hooks/useAccessibility';
import { captureRef } from 'react-native-view-shot';
import type { ShareOptions } from '../types';

export interface SharePreviewModalProps {
  /** Controls modal visibility */
  visible: boolean;
  /** Source photo URI */
  photoUri: string;
  /** AI composition suggestions */
  suggestions: string[];
  /** Grid type display label */
  gridType: string;
  /** Optional composition score 0-100 */
  score?: number;
  /** Grid variant key */
  gridVariant?: string;
  /** Current caption text */
  captionText: string;
  /** Callback when user edits caption */
  onCaptionChange: (text: string) => void;
  /** Callback when user taps Share — passed captured image URI */
  onShare: (capturedUri: string, captionText: string) => void;
  /** Callback when user taps Cancel */
  onCancel: () => void;
  /** Aspect ratio of the photo (width/height). Defaults to 3/4 portrait. */
  photoAspectRatio?: number;
  /** Score reason text (e.g. '主体偏左，建议右移') */
  scoreReason?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_CAPTION_CHARS = 200;

// Grid variant metadata
const GRID_META: Record<string, { icon: string; label: string }> = {
  thirds:   { icon: '📐', label: '三分法' },
  golden:   { icon: '🥇', label: '黄金分割' },
  diagonal: { icon: '↗️', label: '对角线' },
  spiral:   { icon: '🌀', label: '螺旋构图' },
  none:     { icon: '⬜', label: '无网格' },
};

function buildStars(score: number): string {
  const stars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

// ---- Module-level static styles (no theme dependency) ----
const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: SCREEN_W - 40,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
  },
  panel: {
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  gridTypeTag: {
    marginLeft: 'auto',
    fontSize: 12,
    opacity: 0.7,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stars: {
    fontSize: 14,
    letterSpacing: 1,
  },
  scoreNum: {
    fontSize: 12,
    opacity: 0.7,
  },
  suggestionsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  suggestionChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.15,
  },
  captionLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  captionInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sharingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  // Off-screen capture target
  offscreenCard: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
});

/**
 * SharePreviewModal — full-screen preview shown before sharing.
 *
 * Animations (entrance/exit):
 *   Backdrop: fade 0→1 / 1→0 (200ms)
 *   Card: scale 0.92→1 + opacity 0→1 / 1→0 (250ms ease-out)
 */
export function SharePreviewModal({
  visible,
  photoUri,
  suggestions,
  gridType,
  score,
  gridVariant = 'thirds',
  captionText,
  onCaptionChange,
  onShare,
  onCancel,
  photoAspectRatio = 3 / 4,
  scoreReason,
}: SharePreviewModalProps) {
  const { colors, theme } = useTheme();
  const { reducedMotion } = useAccessibilityReducedMotion();
  const meta = GRID_META[gridVariant] ?? GRID_META['thirds'];

  // Off-screen ref for view-shot capture
  const captureViewRef = useRef<View>(null);
  const [sharing, setSharing] = React.useState(false);

  // Animation shared values
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: reducedMotion ? 0 : 200, easing: Easing.out(Easing.ease) });
      cardScale.value = withTiming(1, { duration: reducedMotion ? 0 : 250, easing: Easing.out(Easing.ease) });
      cardOpacity.value = withTiming(1, { duration: reducedMotion ? 0 : 250, easing: Easing.out(Easing.ease) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: reducedMotion ? 0 : 180, easing: Easing.in(Easing.ease) });
      cardScale.value = withTiming(0.92, { duration: reducedMotion ? 0 : 180, easing: Easing.in(Easing.ease) });
      cardOpacity.value = withTiming(0, { duration: reducedMotion ? 0 : 180, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) runOnJS(onCancel)();
      });
    }
  }, [visible, reducedMotion]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const isDark = theme === 'dark';
  const accentColor = colors.accent ?? '#E8D5B7';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDark ? '#AAAAAA' : '#666666';
  const panelBg = isDark ? 'rgba(20,20,20,0.97)' : 'rgba(255,255,255,0.97)';
  const captionBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const charCountColor = captionText.length >= MAX_CAPTION_CHARS
    ? colors.error
    : captionText.length >= MAX_CAPTION_CHARS - 20
    ? colors.warning
    : textSecondary;

  const handleSharePress = async () => {
    if (sharing || !captureViewRef.current) return;
    setSharing(true);
    try {
      const capturedUri = await captureRef(captureViewRef.current, {
        format: 'jpg',
        quality: 0.9,
      });
      onShare(capturedUri, captionText);
    } catch {
      // Fall back to raw photo if capture fails
      onShare(photoUri, captionText);
    } finally {
      setSharing(false);
    }
  };

  const panelStyles = useMemo(() => StyleSheet.create({
    panel: {
      backgroundColor: panelBg,
      padding: 16,
      gap: 12,
    },
    captionInput: {
      backgroundColor: captionBg,
      color: textPrimary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      minHeight: 72,
      textAlignVertical: 'top',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: dividerColor,
    },
    cancelBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
    },
    shareBtn: {
      flex: 2,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    shareBtnText: {
      color: '#000000',
      fontSize: 15,
      fontWeight: '700',
    },
    cancelBtnText: {
      color: textSecondary,
      fontSize: 15,
      fontWeight: '600',
    },
  }), [panelBg, captionBg, textPrimary, textSecondary, dividerColor, accentColor]);

  const starsColor = isDark ? accentColor : colors.starYellow ?? '#F9A825';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Animated backdrop */}
      <Animated.View style={[staticStyles.overlay, backdropStyle]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
        >
          <Animated.View style={[staticStyles.card, cardAnimatedStyle]}>
            {/* Off-screen capture source for view-shot */}
            <View ref={captureViewRef} style={staticStyles.offscreenCard} collapsable={false}>
              <OffscreenCaptureCard
                photoUri={photoUri}
                suggestions={suggestions}
                gridType={gridType}
                score={score}
                gridVariant={gridVariant}
                scoreReason={scoreReason}
                photoAspectRatio={photoAspectRatio}
              />
            </View>

            {/* Visible preview card */}
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
              {/* Photo thumbnail */}
              <Image
                source={{ uri: photoUri }}
                style={[staticStyles.photo, { aspectRatio: photoAspectRatio }]}
                resizeMode="cover"
              />

              {/* Info panel */}
              <View style={panelStyles.panel}>
                {/* Grid + score header */}
                <View style={staticStyles.header}>
                  <Text style={staticStyles.gridIcon}>{meta.icon}</Text>
                  <Text style={[staticStyles.gridLabel, { color: textPrimary }]}>
                    {meta.label}
                  </Text>
                  <Text style={[staticStyles.gridTypeTag, { color: textSecondary }]}>
                    {gridType}
                  </Text>
                </View>

                {/* Score row */}
                {score !== undefined && (
                  <View style={staticStyles.scoreRow}>
                    <Text style={[staticStyles.stars, { color: starsColor }]}>
                      {buildStars(score)}
                    </Text>
                    <Text style={[staticStyles.scoreNum, { color: textSecondary }]}>
                      ({score}分)
                    </Text>
                    {scoreReason && (
                      <Text
                        style={[staticStyles.scoreNum, { color: textSecondary, flex: 1, marginLeft: 8 }]}
                        numberOfLines={1}
                      >
                        {scoreReason}
                      </Text>
                    )}
                  </View>
                )}

                {/* Suggestions preview chips */}
                {suggestions.length > 0 && (
                  <View style={staticStyles.suggestionsPreview}>
                    {suggestions.slice(0, 3).map((s, i) => {
                      const clean = s.replace(/^\[[^\]]+\]\s*/, '').trim();
                      return (
                        <View
                          key={i}
                          style={[
                            staticStyles.suggestionChip,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' },
                          ]}
                        >
                          <Text style={[{ fontSize: 11, color: textSecondary }]} numberOfLines={1}>
                            💡 {clean}
                          </Text>
                        </View>
                      );
                    })}
                    {suggestions.length > 3 && (
                      <View
                        style={[
                          staticStyles.suggestionChip,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' },
                        ]}
                      >
                        <Text style={[{ fontSize: 11, color: textSecondary }]}>
                          +{suggestions.length - 3} 更多
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={[staticStyles.divider, panelStyles.divider]} />

                {/* Caption input */}
                <View>
                  <Text style={[staticStyles.captionLabel, { color: textSecondary }]}>
                    添加配文（可选）
                  </Text>
                  <TextInput
                    style={panelStyles.captionInput}
                    value={captionText}
                    onChangeText={onCaptionChange}
                    placeholder="写点什么..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                    multiline
                    maxLength={MAX_CAPTION_CHARS}
                    accessibilityLabel="分享配文"
                    accessibilityHint="输入你想添加的个人文字"
                    testID="caption-input"
                  />
                  <Text style={[staticStyles.charCount, { color: charCountColor }]}>
                    {captionText.length}/{MAX_CAPTION_CHARS}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={staticStyles.actions}>
                  <TouchableOpacity
                    style={[
                      panelStyles.cancelBtn,
                      { borderColor: dividerColor },
                    ]}
                    onPress={onCancel}
                    disabled={sharing}
                    accessibilityLabel="取消"
                    accessibilityRole="button"
                    testID="cancel-btn"
                  >
                    <Text style={panelStyles.cancelBtnText}>取消</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      panelStyles.shareBtn,
                      { backgroundColor: accentColor },
                    ]}
                    onPress={handleSharePress}
                    disabled={sharing}
                    accessibilityLabel="分享"
                    accessibilityRole="button"
                    testID="share-btn"
                  >
                    {sharing ? (
                      <Text style={panelStyles.shareBtnText}>分享中...</Text>
                    ) : (
                      <>
                        <Ionicons name="share-outline" size={16} color="#000000" />
                        <Text style={panelStyles.shareBtnText}>分享</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Sharing overlay */}
            {sharing && (
              <View style={staticStyles.sharingOverlay}>
                <Ionicons name="cloud-upload-outline" size={36} color="#FFFFFF" />
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ---- Offscreen capture card ----
// Mirrors ShareCard's look so the captured image matches what user previewed.
const OffscreenCard = React.memo(function OffscreenCard({
  photoUri,
  suggestions,
  gridType,
  score,
  gridVariant,
  scoreReason,
  photoAspectRatio,
}: {
  photoUri: string;
  suggestions: string[];
  gridType: string;
  score?: number;
  gridVariant?: string;
  scoreReason?: string;
  photoAspectRatio: number;
}) {
  const { colors, theme } = useTheme();
  const meta = GRID_META[gridVariant ?? 'thirds'] ?? GRID_META['thirds'];

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.88)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDark ? '#AAAAAA' : '#666666';
  const accentColor = colors.accent ?? '#E8D5B7';

  const cardWidth = SCREEN_W;
  const cardHeight = cardWidth * photoAspectRatio;

  const cs = useMemo(() => StyleSheet.create({
    card: { width: cardWidth, height: cardHeight, backgroundColor: '#000' },
    panel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: panelBg,
      borderTopWidth: 1,
      borderColor: panelBorder,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    gridIcon: { fontSize: 20, marginRight: 8 },
    gridLabel: { fontSize: 15, fontWeight: '600', color: textPrimary },
    gridTypeTag: { marginLeft: 'auto', fontSize: 12, color: textSecondary },
    scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stars: { fontSize: 16, color: accentColor, letterSpacing: 2 },
    scoreNum: { fontSize: 13, color: textSecondary, marginLeft: 8 },
    scoreReason: { fontSize: 11, color: textSecondary, marginLeft: 8, flexShrink: 1, maxWidth: 140 },
    suggestionsHeader: { fontSize: 12, color: textSecondary, marginBottom: 6, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
    suggestionItem: { fontSize: 13, color: textPrimary, lineHeight: 20, marginBottom: 4 },
    footer: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: panelBorder, paddingTop: 10 },
    footerText: { fontSize: 12, color: textSecondary, textAlign: 'center' },
  }), [panelBg, panelBorder, textPrimary, textSecondary, accentColor, cardWidth, cardHeight]);

  return (
    <View style={cs.card}>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={cs.panel}>
        <View style={cs.header}>
          <Text style={cs.gridIcon}>{meta.icon}</Text>
          <Text style={cs.gridLabel}>{meta.label}</Text>
          <Text style={cs.gridTypeTag}>{gridType}</Text>
        </View>
        {score !== undefined && (
          <View style={cs.scoreRow}>
            <Text style={cs.stars}>{buildStars(score)}</Text>
            <Text style={cs.scoreNum}>({score}分)</Text>
            {scoreReason && <Text style={cs.scoreReason} numberOfLines={2}>{scoreReason}</Text>}
          </View>
        )}
        {suggestions.length > 0 && (
          <>
            <Text style={cs.suggestionsHeader}>💡 AI 建议</Text>
            {suggestions.map((s, i) => {
              const clean = s.replace(/^\[[^\]]+\]\s*/, '').trim();
              return (
                <Text key={i} style={cs.suggestionItem}>• {clean}</Text>
              );
            })}
          </>
        )}
        <View style={cs.footer}>
          <Text style={cs.footerText}>📸 由拍摄参谋生成</Text>
        </View>
      </View>
    </View>
  );
});

function OffscreenCaptureCard(props: Parameters<typeof OffscreenCard>[0]) {
  return <OffscreenCard {...props} />;
}

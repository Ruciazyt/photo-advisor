import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CameraType } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { SunToggleButton } from './SunPositionOverlay';
import { ShareButton } from './ShareButton';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import type { GridVariant } from '../types';
import type { SharedValue } from 'react-native-reanimated';

const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法',
  golden: '黄金分割',
  diagonal: '对角线',
  spiral: '螺旋线',
  none: '关闭',
};

export interface CameraTopBarProps {
  // Grid
  gridVariant: GridVariant;
  showGridModal: boolean;
  onGridPress: () => void;
  onGridSelect: (v: GridVariant) => void;
  onGridModalClose: () => void;
  // Histogram
  showHistogram: boolean;
  onHistogramToggle: () => void;
  onHistogramPressIn: () => void;
  onHistogramPressOut: () => void;
  // Level
  showLevel: boolean;
  onLevelToggle: () => void;
  // Sun
  showSunOverlay: boolean;
  onSunToggle: () => void;
  // Focus guide
  showFocusGuide: boolean;
  onFocusGuideToggle: () => void;
  // Focus peaking
  showFocusPeaking: boolean;
  onFocusPeakingToggle: () => void;
  // Voice
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  // RAW
  rawMode: boolean;
  rawSupported: boolean;
  onRawToggle: () => void;
  // Challenge
  challengeMode: boolean;
  onChallengeToggle: () => void;
  // Timer
  timerDuration: number;
  countdownActive: boolean;
  onTimerPress: () => void; // opens the timer selector modal
  onCancelCountdown: () => void;
  // Favorites
  lastCapturedUri: string | null;
  onSaveToFavorites: () => void;
  // Share
  suggestions: string[];
  lastCapturedScore: number | null;
  lastCapturedScoreReason: string | null;
  // Compare
  showKeypoints: boolean;
  onComparePress: () => void;
  // Burst
  burstActive: boolean;
  burstCount: number;
  // Toast
  toastOpacity: SharedValue<number>;
  toastMessage: string;
}

export function CameraTopBar({  gridVariant,
  onGridPress,
  showHistogram,
  onHistogramToggle,
  onHistogramPressIn,
  onHistogramPressOut,
  showLevel,
  onLevelToggle,
  showSunOverlay,
  onSunToggle,
  showFocusGuide,
  onFocusGuideToggle,
  showFocusPeaking,
  onFocusPeakingToggle,
  voiceEnabled,
  onVoiceToggle,
  rawMode,
  rawSupported,
  onRawToggle,
  challengeMode,
  onChallengeToggle,
  timerDuration,
  countdownActive,
  onTimerPress,
  onCancelCountdown,
  lastCapturedUri,
  onSaveToFavorites,
  suggestions,
  lastCapturedScore,
  lastCapturedScoreReason,
  showKeypoints,
  onComparePress,
  burstActive,
  burstCount,
  toastOpacity,
  toastMessage,
}: CameraTopBarProps) {
  const { colors } = useTheme();

  const compareBtnA11y = useAccessibilityButton({
    label: '对比模式',
    hint: '打开照片对比视图',
    role: 'button',
  });

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toastOpacity.value,
  }));

  // Dynamic styles using theme colors
  const dynamicTopBarStyles = StyleSheet.create({
    gridSelector: {
      position: 'absolute',
      top: 60,
      left: 16,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
    },
    gridSelectorText: {
      color: colors.topBarText,
      fontSize: 13,
      fontWeight: '600',
    },
    histogramSelector: {
      position: 'absolute',
      top: 60,
      left: 244,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
    },
    histogramSelectorActive: {
      backgroundColor: colors.topBarSelectorBgActive,
      borderColor: colors.topBarSelectorBorderActive,
    },
    histogramSelectorText: {
      color: colors.topBarText,
      fontSize: 13,
      fontWeight: '600',
    },
    levelSelector: {
      position: 'absolute',
      top: 60,
      left: 330,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
    },
    levelSelectorActive: {
      backgroundColor: colors.topBarSelectorBgActive,
      borderColor: colors.topBarSelectorBorderActive,
    },
    levelSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    levelSelectorTextActive: {
      color: colors.topBarText,
    },
    timerSelector: {
      position: 'absolute',
      top: 60,
      left: 130,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
    },
    timerSelectorActive: {
      backgroundColor: colors.timerActiveBg,
      borderColor: colors.timerActiveBorder,
    },
    timerSelectorText: {
      color: colors.topBarText,
      fontSize: 13,
      fontWeight: '600',
    },
    favoriteSelector: {
      position: 'absolute',
      top: 60,
      right: 16,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
    },
    favoriteSelectorDisabled: {
      opacity: 0.5,
    },
    compareBtn: {
      position: 'absolute',
      top: 60,
      right: 70,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.topBarBorderActive,
      zIndex: 15,
    },
    compareBtnText: {
      color: colors.topBarText,
      fontSize: 13,
      fontWeight: '600',
    },
    toast: {
      position: 'absolute',
      top: 110,
      alignSelf: 'center',
      backgroundColor: colors.toastBg,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 8,
      zIndex: 20,
    },
    toastText: {
      color: colors.topBarText,
      fontSize: 14,
      fontWeight: '700',
    },
    voiceSelector: {
      position: 'absolute',
      top: 60,
      left: 195,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    voiceSelectorActive: {
      backgroundColor: colors.voiceActiveBg,
    },
    voiceSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    voiceSelectorTextActive: {
      color: colors.accent,
    },
    challengeSelector: {
      position: 'absolute',
      top: 110,
      right: 16,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    challengeSelectorActive: {
      backgroundColor: colors.challengeActiveBg,
      borderColor: colors.challengeActiveBorder,
    },
    challengeSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    challengeSelectorTextActive: {
      color: colors.challengeActiveText,
    },
    rawSelector: {
      position: 'absolute',
      top: 110,
      left: 16,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rawSelectorActive: {
      backgroundColor: colors.rawActiveBg,
      borderColor: colors.rawActiveBorder,
    },
    rawSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    rawSelectorTextActive: {
      color: colors.rawActiveText,
    },
    focusGuideSelector: {
      position: 'absolute',
      top: 60,
      left: 300,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    focusGuideSelectorActive: {
      backgroundColor: colors.focusGuideActiveBg,
      borderColor: colors.focusGuideActiveBorder,
    },
    focusGuideSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    focusGuideSelectorTextActive: {
      color: colors.focusGuideActiveText,
    },
    focusPeakingSelector: {
      position: 'absolute',
      top: 60,
      left: 360,
      zIndex: 10,
      backgroundColor: colors.topBarBg,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.topBarBorderInactive,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    focusPeakingSelectorActive: {
      backgroundColor: colors.focusGuideActiveBg,
      borderColor: colors.focusGuideActiveBorder,
    },
    focusPeakingSelectorText: {
      color: colors.topBarTextSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    focusPeakingSelectorTextActive: {
      color: colors.focusGuideActiveText,
    },
    burstIndicator: {
      position: 'absolute',
      top: 60,
      right: 70,
      backgroundColor: colors.burstIndicatorBg,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      zIndex: 15,
    },
    burstText: {
      color: colors.burstIndicatorText,
      fontSize: 12,
      fontWeight: '800',
    },
  });

  return (
    <>
      {/* Grid Type Selector */}
      <TouchableOpacity
        style={dynamicTopBarStyles.gridSelector}
        onPress={onGridPress}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: `网格类型：${GRID_LABELS[gridVariant]}`,
          hint: '打开网格类型选择器',
          role: 'button',
        })}
      >
        <Text style={dynamicTopBarStyles.gridSelectorText}>📐 {GRID_LABELS[gridVariant]}</Text>
      </TouchableOpacity>

      {/* Histogram Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.histogramSelector, showHistogram && dynamicTopBarStyles.histogramSelectorActive]}
        onPress={onHistogramToggle}
        onPressIn={onHistogramPressIn}
        onPressOut={onHistogramPressOut}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '直方图',
          hint: showHistogram ? '关闭直方图' : '打开直方图',
          role: 'button',
        })}
        accessibilityState={{ selected: showHistogram }}
      >
        <Text style={dynamicTopBarStyles.histogramSelectorText}>📊 直方图</Text>
      </TouchableOpacity>

      {/* Level Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.levelSelector, showLevel && dynamicTopBarStyles.levelSelectorActive]}
        onPress={onLevelToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '水平仪',
          hint: showLevel ? '关闭水平仪' : '打开水平仪',
          role: 'button',
        })}
        accessibilityState={{ selected: showLevel }}
      >
        <Text style={[dynamicTopBarStyles.levelSelectorText, showLevel && dynamicTopBarStyles.levelSelectorTextActive]}>🔮 水平仪</Text>
      </TouchableOpacity>

      {/* Sun Position Toggle */}
      <SunToggleButton
        visible={showSunOverlay}
        onPress={onSunToggle}
      />

      {/* Focus Guide Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.focusGuideSelector, showFocusGuide && dynamicTopBarStyles.focusGuideSelectorActive]}
        onPress={onFocusGuideToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '对焦辅助',
          hint: showFocusGuide ? '关闭对焦辅助' : '打开对焦辅助',
          role: 'button',
        })}
        accessibilityState={{ selected: showFocusGuide }}
      >
        <Text style={[dynamicTopBarStyles.focusGuideSelectorText, showFocusGuide && dynamicTopBarStyles.focusGuideSelectorTextActive]}>🎯 对焦</Text>
      </TouchableOpacity>

      {/* Focus Peaking Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.focusPeakingSelector, showFocusPeaking && dynamicTopBarStyles.focusPeakingSelectorActive]}
        onPress={onFocusPeakingToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '峰值',
          hint: showFocusPeaking ? '关闭对焦峰值' : '打开对焦峰值',
          role: 'button',
        })}
        accessibilityState={{ selected: showFocusPeaking }}
      >
        <Text style={[dynamicTopBarStyles.focusPeakingSelectorText, showFocusPeaking && dynamicTopBarStyles.focusPeakingSelectorTextActive]}>🎚️ 峰值</Text>
      </TouchableOpacity>

      {/* Voice Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.voiceSelector, voiceEnabled && dynamicTopBarStyles.voiceSelectorActive]}
        onPress={onVoiceToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '语音控制',
          hint: voiceEnabled ? '关闭语音控制' : '打开语音控制',
          role: 'button',
        })}
        accessibilityState={{ selected: voiceEnabled }}
      >
        <Ionicons
          name={voiceEnabled ? 'volume-high' : 'volume-mute'}
          size={16}
          color={voiceEnabled ? colors.accent : colors.topBarTextSecondary}
        />
        <Text style={[dynamicTopBarStyles.voiceSelectorText, voiceEnabled && { color: colors.accent }]}>语音</Text>
      </TouchableOpacity>

      {/* RAW Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.rawSelector, rawMode && dynamicTopBarStyles.rawSelectorActive]}
        onPress={onRawToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: 'RAW模式',
          hint: rawMode ? '关闭RAW模式' : '打开RAW模式',
          role: 'button',
        })}
        accessibilityState={{ selected: rawMode, disabled: !rawSupported }}
      >
        <Text style={[dynamicTopBarStyles.rawSelectorText, rawMode && dynamicTopBarStyles.rawSelectorTextActive]}>📷 RAW</Text>
      </TouchableOpacity>

      {/* Challenge Mode Toggle */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.challengeSelector, challengeMode && dynamicTopBarStyles.challengeSelectorActive]}
        onPress={onChallengeToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '挑战模式',
          hint: challengeMode ? '关闭挑战模式' : '打开挑战模式',
          role: 'button',
        })}
        accessibilityState={{ selected: challengeMode }}
      >
        <Text style={[dynamicTopBarStyles.challengeSelectorText, challengeMode && dynamicTopBarStyles.challengeSelectorTextActive]}>🎮 挑战</Text>
      </TouchableOpacity>

      {/* Timer Duration Selector */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.timerSelector, countdownActive && dynamicTopBarStyles.timerSelectorActive]}
        onPress={countdownActive ? onCancelCountdown : onTimerPress}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: countdownActive ? '取消定时' : `定时${timerDuration}秒`,
          hint: countdownActive ? '取消倒计时拍摄' : '选择定时拍摄时长',
          role: 'button',
        })}
        accessibilityState={{ selected: countdownActive }}
      >
        <Text style={dynamicTopBarStyles.timerSelectorText}>
          {countdownActive ? '✕ 取消' : `⏱ ${timerDuration}s`}
        </Text>
      </TouchableOpacity>

      {/* Save to Favorites */}
      <TouchableOpacity
        style={[dynamicTopBarStyles.favoriteSelector, !lastCapturedUri && dynamicTopBarStyles.favoriteSelectorDisabled]}
        onPress={onSaveToFavorites}
        disabled={!lastCapturedUri}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '收藏',
          hint: '将照片保存到收藏',
          role: 'button',
          enabled: !!lastCapturedUri,
        })}
      >
        <Ionicons name="heart" size={18} color={lastCapturedUri ? colors.favoriteIcon : colors.textSecondary} />
      </TouchableOpacity>

      {/* Share Button */}
      <ShareButton
        photoUri={lastCapturedUri ?? ''}
        suggestions={suggestions}
        gridType={GRID_LABELS[gridVariant]}
        score={lastCapturedScore ?? undefined}
        scoreReason={lastCapturedScoreReason ?? undefined}
        gridVariant={gridVariant}
      />

      {/* Compare Mode */}
      {lastCapturedUri && !showKeypoints && (
        <TouchableOpacity
          style={dynamicTopBarStyles.compareBtn}
          onPress={onComparePress}
          activeOpacity={0.8}
          {...compareBtnA11y}
        >
          <Text style={dynamicTopBarStyles.compareBtnText}>🖼️ 对比</Text>
        </TouchableOpacity>
      )}

      {/* Burst Mode Indicator */}
      {burstActive && (
        <View style={dynamicTopBarStyles.burstIndicator}>
          <Ionicons name="flash" size={14} color={colors.challengeActiveText} />
          <Text style={dynamicTopBarStyles.burstText}>连拍中 {burstCount}/5</Text>
        </View>
      )}

      {/* Toast */}
      <Animated.View style={[dynamicTopBarStyles.toast, toastAnimatedStyle]} pointerEvents="none">
        <Text style={dynamicTopBarStyles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </>
  );
}

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

// Module-level static styles (no theme/positional dependency)
const staticTopBarStyles = StyleSheet.create({
  gridSelector: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  gridSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  histogramSelector: {
    position: 'absolute',
    top: 60,
    left: 244,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  histogramSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.35)',
    borderColor: 'rgba(232,213,183,0.6)',
  },
  histogramSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  levelSelector: {
    position: 'absolute',
    top: 60,
    left: 330,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  levelSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.35)',
    borderColor: 'rgba(232,213,183,0.6)',
  },
  levelSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  levelSelectorTextActive: {
    color: '#FFFFFF',
  },
  timerSelector: {
    position: 'absolute',
    top: 60,
    left: 130,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timerSelectorActive: {
    backgroundColor: 'rgba(255,82,82,0.6)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timerSelectorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  favoriteSelector: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  favoriteSelectorDisabled: {
    opacity: 0.5,
  },
  compareBtn: {
    position: 'absolute',
    top: 60,
    right: 70,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 15,
  },
  compareBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,138,0.9)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 20,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  voiceSelector: {
    position: 'absolute',
    top: 60,
    left: 195,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceSelectorActive: {
    backgroundColor: 'rgba(232,213,183,0.2)',
  },
  voiceSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  voiceSelectorTextActive: {
    color: '#E8D5B7',
  },
  challengeSelector: {
    position: 'absolute',
    top: 110,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeSelectorActive: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: 'rgba(255,215,0,0.6)',
  },
  challengeSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  challengeSelectorTextActive: {
    color: '#FFD700',
  },
  rawSelector: {
    position: 'absolute',
    top: 110,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rawSelectorActive: {
    backgroundColor: 'rgba(0,200,100,0.2)',
    borderColor: 'rgba(0,200,100,0.6)',
  },
  rawSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  rawSelectorTextActive: {
    color: '#00C864',
  },
  focusGuideSelector: {
    position: 'absolute',
    top: 60,
    left: 300,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusGuideSelectorActive: {
    backgroundColor: 'rgba(255,220,0,0.15)',
    borderColor: 'rgba(255,220,0,0.5)',
  },
  focusGuideSelectorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  focusGuideSelectorTextActive: {
    color: '#FFDC00',
  },
  burstIndicator: {
    position: 'absolute',
    top: 60,
    right: 70,
    backgroundColor: 'rgba(255,215,0,0.85)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 15,
  },
  burstText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
});

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

  return (
    <>
      {/* Grid Type Selector */}
      <TouchableOpacity
        style={staticTopBarStyles.gridSelector}
        onPress={onGridPress}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: `网格类型：${GRID_LABELS[gridVariant]}`,
          hint: '打开网格类型选择器',
          role: 'button',
        })}
      >
        <Text style={staticTopBarStyles.gridSelectorText}>📐 {GRID_LABELS[gridVariant]}</Text>
      </TouchableOpacity>

      {/* Histogram Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.histogramSelector, showHistogram && staticTopBarStyles.histogramSelectorActive]}
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
        <Text style={staticTopBarStyles.histogramSelectorText}>📊 直方图</Text>
      </TouchableOpacity>

      {/* Level Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.levelSelector, showLevel && staticTopBarStyles.levelSelectorActive]}
        onPress={onLevelToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '水平仪',
          hint: showLevel ? '关闭水平仪' : '打开水平仪',
          role: 'button',
        })}
        accessibilityState={{ selected: showLevel }}
      >
        <Text style={[staticTopBarStyles.levelSelectorText, showLevel && staticTopBarStyles.levelSelectorTextActive]}>🔮 水平仪</Text>
      </TouchableOpacity>

      {/* Sun Position Toggle */}
      <SunToggleButton
        visible={showSunOverlay}
        onPress={onSunToggle}
      />

      {/* Focus Guide Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.focusGuideSelector, showFocusGuide && staticTopBarStyles.focusGuideSelectorActive]}
        onPress={onFocusGuideToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '对焦辅助',
          hint: showFocusGuide ? '关闭对焦辅助' : '打开对焦辅助',
          role: 'button',
        })}
        accessibilityState={{ selected: showFocusGuide }}
      >
        <Text style={[staticTopBarStyles.focusGuideSelectorText, showFocusGuide && staticTopBarStyles.focusGuideSelectorTextActive]}>🎯 对焦</Text>
      </TouchableOpacity>

      {/* Voice Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.voiceSelector, voiceEnabled && staticTopBarStyles.voiceSelectorActive]}
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
          color={voiceEnabled ? colors.accent : 'rgba(255,255,255,0.6)'}
        />
        <Text style={[staticTopBarStyles.voiceSelectorText, voiceEnabled && { color: colors.accent }]}>语音</Text>
      </TouchableOpacity>

      {/* RAW Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.rawSelector, rawMode && staticTopBarStyles.rawSelectorActive]}
        onPress={onRawToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: 'RAW模式',
          hint: rawMode ? '关闭RAW模式' : '打开RAW模式',
          role: 'button',
        })}
        accessibilityState={{ selected: rawMode, disabled: !rawSupported }}
      >
        <Text style={[staticTopBarStyles.rawSelectorText, rawMode && staticTopBarStyles.rawSelectorTextActive]}>📷 RAW</Text>
      </TouchableOpacity>

      {/* Challenge Mode Toggle */}
      <TouchableOpacity
        style={[staticTopBarStyles.challengeSelector, challengeMode && staticTopBarStyles.challengeSelectorActive]}
        onPress={onChallengeToggle}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: '挑战模式',
          hint: challengeMode ? '关闭挑战模式' : '打开挑战模式',
          role: 'button',
        })}
        accessibilityState={{ selected: challengeMode }}
      >
        <Text style={[staticTopBarStyles.challengeSelectorText, challengeMode && staticTopBarStyles.challengeSelectorTextActive]}>🎮 挑战</Text>
      </TouchableOpacity>

      {/* Timer Duration Selector */}
      <TouchableOpacity
        style={[staticTopBarStyles.timerSelector, countdownActive && staticTopBarStyles.timerSelectorActive]}
        onPress={countdownActive ? onCancelCountdown : onTimerPress}
        activeOpacity={0.7}
        {...useAccessibilityButton({
          label: countdownActive ? '取消定时' : `定时${timerDuration}秒`,
          hint: countdownActive ? '取消倒计时拍摄' : '选择定时拍摄时长',
          role: 'button',
        })}
        accessibilityState={{ selected: countdownActive }}
      >
        <Text style={staticTopBarStyles.timerSelectorText}>
          {countdownActive ? '✕ 取消' : `⏱ ${timerDuration}s`}
        </Text>
      </TouchableOpacity>

      {/* Save to Favorites */}
      <TouchableOpacity
        style={[staticTopBarStyles.favoriteSelector, !lastCapturedUri && staticTopBarStyles.favoriteSelectorDisabled]}
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
        <Ionicons name="heart" size={18} color={lastCapturedUri ? '#FF6B8A' : '#555'} />
      </TouchableOpacity>

      {/* Share Button */}
      <ShareButton
        photoUri={lastCapturedUri ?? ''}
        suggestions={suggestions}
        gridType={GRID_LABELS[gridVariant]}
        score={lastCapturedScore ?? undefined}
        gridVariant={gridVariant}
      />

      {/* Compare Mode */}
      {lastCapturedUri && !showKeypoints && (
        <TouchableOpacity
          style={staticTopBarStyles.compareBtn}
          onPress={onComparePress}
          activeOpacity={0.8}
          {...compareBtnA11y}
        >
          <Text style={staticTopBarStyles.compareBtnText}>🖼️ 对比</Text>
        </TouchableOpacity>
      )}

      {/* Burst Mode Indicator */}
      {burstActive && (
        <View style={staticTopBarStyles.burstIndicator}>
          <Ionicons name="flash" size={14} color="#FFD700" />
          <Text style={staticTopBarStyles.burstText}>连拍中 {burstCount}/5</Text>
        </View>
      )}

      {/* Toast */}
      <Animated.View style={[staticTopBarStyles.toast, toastAnimatedStyle]} pointerEvents="none">
        <Text style={staticTopBarStyles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </>
  );
}

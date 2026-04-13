import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraType } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { SunToggleButton } from './SunPositionOverlay';
import { ShareButton } from './ShareButton';
import { GridVariant } from './GridOverlay';

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
  onTimerPress: () => void;
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
  toastOpacity: Animated.Value;
  toastMessage: string;
}

export function CameraTopBar({
  gridVariant,
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

  const styles = StyleSheet.create({
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
      borderColor: colors.accent,
    },
    voiceSelectorText: {
      color: 'rgba(255,255,255,0.6)',
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

  return (
    <>
      {/* Grid Type Selector */}
      {/* Grid Type Selector */}
      <TouchableOpacity
        style={styles.gridSelector}
        onPress={onGridPress}
        activeOpacity={0.7}
      >
        <Text style={styles.gridSelectorText}>📐 {GRID_LABELS[gridVariant]}</Text>
      </TouchableOpacity>

      {/* Histogram Toggle */}
      <TouchableOpacity
        style={[styles.histogramSelector, showHistogram && styles.histogramSelectorActive]}
        onPress={onHistogramToggle}
        onPressIn={onHistogramPressIn}
        onPressOut={onHistogramPressOut}
        activeOpacity={0.7}
      >
        <Text style={styles.histogramSelectorText}>📊 直方图</Text>
      </TouchableOpacity>

      {/* Level Toggle */}
      <TouchableOpacity
        style={[styles.levelSelector, showLevel && styles.levelSelectorActive]}
        onPress={onLevelToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.levelSelectorText, showLevel && styles.levelSelectorTextActive]}>🔮 水平仪</Text>
      </TouchableOpacity>

      {/* Sun Position Toggle */}
      <SunToggleButton
        visible={showSunOverlay}
        onPress={onSunToggle}
      />

      {/* Focus Guide Toggle */}
      <TouchableOpacity
        style={[styles.focusGuideSelector, showFocusGuide && styles.focusGuideSelectorActive]}
        onPress={onFocusGuideToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.focusGuideSelectorText, showFocusGuide && styles.focusGuideSelectorTextActive]}>🎯 对焦</Text>
      </TouchableOpacity>

      {/* Voice Toggle */}
      <TouchableOpacity
        style={[styles.voiceSelector, voiceEnabled && styles.voiceSelectorActive]}
        onPress={onVoiceToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={voiceEnabled ? 'volume-high' : 'volume-mute'}
          size={16}
          color={voiceEnabled ? colors.accent : 'rgba(255,255,255,0.6)'}
        />
        <Text style={[styles.voiceSelectorText, voiceEnabled && styles.voiceSelectorTextActive]}>语音</Text>
      </TouchableOpacity>

      {/* RAW Toggle */}
      <TouchableOpacity
        style={[styles.rawSelector, rawMode && styles.rawSelectorActive]}
        onPress={onRawToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.rawSelectorText, rawMode && styles.rawSelectorTextActive]}>📷 RAW</Text>
      </TouchableOpacity>

      {/* Challenge Mode Toggle */}
      <TouchableOpacity
        style={[styles.challengeSelector, challengeMode && styles.challengeSelectorActive]}
        onPress={onChallengeToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.challengeSelectorText, challengeMode && styles.challengeSelectorTextActive]}>🎮 挑战</Text>
      </TouchableOpacity>

      {/* Timer Duration Selector */}
      <TouchableOpacity
        style={[styles.timerSelector, countdownActive && styles.timerSelectorActive]}
        onPress={countdownActive ? onCancelCountdown : onTimerPress}
        activeOpacity={0.7}
      >
        <Text style={styles.timerSelectorText}>
          {countdownActive ? '✕ 取消' : `⏱ ${timerDuration}s`}
        </Text>
      </TouchableOpacity>

      {/* Save to Favorites */}
      <TouchableOpacity
        style={[styles.favoriteSelector, !lastCapturedUri && styles.favoriteSelectorDisabled]}
        onPress={onSaveToFavorites}
        disabled={!lastCapturedUri}
        activeOpacity={0.7}
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
          style={styles.compareBtn}
          onPress={onComparePress}
          activeOpacity={0.8}
        >
          <Text style={styles.compareBtnText}>🖼️ 对比</Text>
        </TouchableOpacity>
      )}

      {/* Burst Mode Indicator */}
      {burstActive && (
        <View style={styles.burstIndicator}>
          <Ionicons name="flash" size={14} color="#FFD700" />
          <Text style={styles.burstText}>连拍中 {burstCount}/5</Text>
        </View>
      )}

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </>
  );
}

/**
 * ShareCard — composites a photo with AI composition analysis into a single
 * captureable image for sharing.
 *
 * Layout:
 *   - Full-bleed photo background
 *   - Semi-transparent overlay panel at the bottom with:
 *     - Grid type icon + name
 *     - Star rating (if score is provided)
 *     - AI suggestions list
 *     - "📸 由拍摄参谋生成" footer
 */

import React, { useMemo } from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { ShareOptions } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

// Map gridVariant → display label + emoji
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

export interface ShareCardProps {
  /** Source photo URI */
  photoUri: string;
  /** AI composition suggestions */
  suggestions: string[];
  /** Grid type display label */
  gridType: string;
  /** Optional score 0–100 */
  score?: number;
  /** Grid variant key */
  gridVariant?: string;
  /** Optional one-line score reason (e.g. '主体偏左，建议右移') */
  scoreReason?: string;
}

/**
 * ShareCard must be captured with react-native-view-shot's captureRef to produce
 * the final shareable image.
 */
export function ShareCard({
  photoUri,
  suggestions,
  gridType,
  score,
  gridVariant = 'thirds',
  scoreReason,
}: ShareCardProps) {
  const { colors, theme } = useTheme();
  const meta = GRID_META[gridVariant] ?? GRID_META['thirds'];

  const isDark = theme === 'dark';
  const panelBg = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.88)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A1A';
  const textSecondary = isDark ? '#AAAAAA' : '#666666';
  const accentColor = colors.accent ?? '#E8D5B7';

  const panelStyles = useMemo(() => StyleSheet.create({
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    gridIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    gridLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: textPrimary,
    },
    gridTypeTag: {
      marginLeft: 'auto',
      fontSize: 12,
      color: textSecondary,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    stars: {
      fontSize: 16,
      color: accentColor,
      letterSpacing: 2,
    },
    scoreNum: {
      fontSize: 13,
      color: textSecondary,
      marginLeft: 8,
    },
    scoreReason: {
      fontSize: 11,
      color: textSecondary,
      marginLeft: 8,
      flexShrink: 1,
      maxWidth: 140,
    },
    suggestionsHeader: {
      fontSize: 12,
      color: textSecondary,
      marginBottom: 6,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    suggestionItem: {
      fontSize: 13,
      color: textPrimary,
      lineHeight: 20,
      marginBottom: 4,
    },
    footer: {
      marginTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: panelBorder,
      paddingTop: 10,
    },
    footerText: {
      fontSize: 12,
      color: textSecondary,
      textAlign: 'center',
    },
  }), [panelBg, panelBorder, textPrimary, textSecondary, accentColor]);

  return (
    <View style={styles.card}>
      {/* Photo */}
      <Image
        source={{ uri: photoUri }}
        style={styles.photo}
        resizeMode="cover"
      />

      {/* Overlay panel */}
      <View style={panelStyles.panel}>
        {/* Grid row */}
        <View style={panelStyles.header}>
          <Text style={panelStyles.gridIcon}>{meta.icon}</Text>
          <Text style={panelStyles.gridLabel}>{meta.label}</Text>
          <Text style={panelStyles.gridTypeTag}>{gridType}</Text>
        </View>

        {/* Score row */}
        {score !== undefined && (
          <View style={panelStyles.scoreRow}>
            <Text style={panelStyles.stars}>{buildStars(score)}</Text>
            <Text style={panelStyles.scoreNum}>({score}分)</Text>
            {scoreReason && (
              <Text style={panelStyles.scoreReason} numberOfLines={2}>{scoreReason}</Text>
            )}
          </View>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <>
            <Text style={panelStyles.suggestionsHeader}>💡 AI 建议</Text>
            {suggestions.map((s, i) => {
              const clean = s.replace(/^\[[^\]]+\]\s*/, '').trim();
              return (
                <Text key={i} style={panelStyles.suggestionItem}>
                  • {clean}
                </Text>
              );
            })}
          </>
        )}

        {/* Footer */}
        <View style={panelStyles.footer}>
          <Text style={panelStyles.footerText}>📸 由拍摄参谋生成</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_W,
    // Height is determined by parent via ref measurement;
    // default to a reasonable portrait aspect ratio
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
});

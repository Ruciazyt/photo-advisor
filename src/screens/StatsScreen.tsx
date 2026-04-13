import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../hooks/useFavorites';
import { computeStats, getScoreEmoji, getTrendLabel } from '../services/stats';

interface StatsScreenProps {
  onBack: () => void;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const { colors } = useTheme();
  const { favorites } = useFavorites();
  const stats = computeStats(favorites);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    header: {
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      color: colors.accent,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 1,
    },
    placeholder: {
      width: 40,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      color: colors.accent,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 8,
    },
    emptyHint: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 24,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    summaryValue: {
      color: colors.accent,
      fontSize: 22,
      fontWeight: '700',
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '600',
    },
    trendBadge: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    trendText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    barRow: {
      gap: 8,
    },
    barLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '500',
    },
    barContainer: {
      height: 12,
      backgroundColor: colors.cardBg,
      borderRadius: 6,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 6,
    },
    barValue: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'right',
    },
    scoreChips: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    scoreChip: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      minWidth: 56,
    },
    scoreChipDate: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    scoreChipScore: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 2,
    },
  });

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.title}>拍摄统计</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bar-chart-outline" size={64} color={colors.accent} />
          <Text style={styles.emptyTitle}>暂无数据</Text>
          <Text style={styles.emptyHint}>开始拍摄并收藏照片{'\n'}你的统计数据将显示在这里</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>拍摄统计</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.totalPhotos}</Text>
            <Text style={styles.summaryLabel}>总照片</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {getScoreEmoji(stats.avgScore)} {stats.avgScore}
            </Text>
            <Text style={styles.summaryLabel}>平均分</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.bestScore}</Text>
            <Text style={styles.summaryLabel}>最高分</Text>
          </View>
        </View>

        {/* Recent Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近趋势</Text>
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>
              {getTrendLabel(stats.recentTrend)}
            </Text>
          </View>
        </View>

        {/* Grid Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>构图使用</Text>
          {stats.gridUsages.map((usage) => (
            <View key={usage.gridType} style={styles.barRow}>
              <Text style={styles.barLabel}>{usage.gridType}</Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${usage.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>
                {usage.count} ({usage.percentage}%)
              </Text>
            </View>
          ))}
        </View>

        {/* Scene Usage */}
        {stats.sceneUsages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>场景分布</Text>
            {stats.sceneUsages.map((usage) => (
              <View key={usage.sceneTag} style={styles.barRow}>
                <Text style={styles.barLabel}>{usage.sceneTag}</Text>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${usage.percentage}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>
                  {usage.count} ({usage.percentage}%)
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Score History */}
        {stats.scoreHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近评分</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scoreChips}
            >
              {stats.scoreHistory.slice(0, 10).map((item, idx) => (
                <View key={idx} style={styles.scoreChip}>
                  <Text style={styles.scoreChipDate}>{item.date}</Text>
                  <Text style={styles.scoreChipScore}>{item.score}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

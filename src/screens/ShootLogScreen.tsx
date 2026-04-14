import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useShootLog } from '../hooks/useShootLog';
import type { ShootLogEntry } from '../types';

const GRID_LABELS: Record<string, string> = {
  thirds: '三分法',
  golden: '黄金比例',
  diagonal: '对角线',
  spiral: '螺旋',
  none: '无网格',
};

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getScoreColor(score: number): string {
  if (score >= 75) return Colors.success;
  if (score >= 60) return '#FFC107';
  return Colors.error;
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) + '22' }]}>
      <Text style={{ fontSize: 11, color: getScoreColor(score) }}>★ {score}</Text>
    </View>
  );
}

interface EntryCardProps {
  entry: ShootLogEntry;
}

function EntryCard({ entry }: EntryCardProps) {
  const gridLabel = GRID_LABELS[entry.gridType] ?? entry.gridType;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.timeText}>{formatTime(entry.date)}</Text>
        <View style={styles.gridBadge}>
          <Text style={styles.gridBadgeText}>📐 {gridLabel}</Text>
        </View>
        {entry.score !== undefined && entry.score !== null ? (
          <ScoreBadge score={entry.score} />
        ) : null}
      </View>

      <View style={styles.cardBody}>
        {entry.sceneTag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{entry.sceneTag}</Text>
          </View>
        ) : null}
        {entry.locationName ? (
          <Text style={styles.locationText}>📍 {entry.locationName}</Text>
        ) : null}
        {entry.wasFavorite ? (
          <Text style={styles.favoriteTag}>❤️ 已收藏</Text>
        ) : null}
        {entry.timerDuration && entry.timerDuration > 0 ? (
          <Text style={styles.timerBadge}>⏱ {entry.timerDuration}s</Text>
        ) : null}
      </View>

      {entry.scoreReason ? (
        <Text style={styles.scoreReasonText}>{entry.scoreReason}</Text>
      ) : null}

      {entry.suggestions.length > 0 ? (
        <Text style={styles.suggestionText} numberOfLines={2}>
          💡 {entry.suggestions[0]}
        </Text>
      ) : null}
    </View>
  );
}

interface Section {
  title: string;
  data: ShootLogEntry[];
}

function buildSections(log: ShootLogEntry[]): Section[] {
  const groups: Record<string, ShootLogEntry[]> = {};
  for (const entry of log) {
    const header = formatDateHeader(entry.date);
    if (!groups[header]) groups[header] = [];
    groups[header].push(entry);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export function ShootLogScreen() {
  const { log, loading, clearLog, totalShoots, avgScore, favoriteCount } = useShootLog();
  const sections = buildSections(log);

  const handleClear = () => {
    Alert.alert('清空日志', '确定要清空所有拍摄记录吗？此操作不可撤销。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => clearLog(),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>拍摄日志</Text>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>拍摄日志</Text>
        <Text style={styles.subtitle}>
          {totalShoots} 次拍摄 · {avgScore || '—'} 平均分 · {favoriteCount} 收藏
        </Text>
        {totalShoots > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearBtnText}>清空</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {totalShoots === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="camera-outline" size={64} color={Colors.accent} />
          <Text style={styles.emptyTitle}>还没有拍摄记录</Text>
          <Text style={styles.emptyHint}>开始第一次拍摄吧！</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.title}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[]}
          renderItem={({ item: section }) => (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
              {section.data.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  title: {
    color: Colors.accent,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  clearBtn: {
    position: 'absolute',
    right: 16,
    top: 64,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyHint: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
  },
  sectionHeaderText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  timeText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  gridBadge: {
    backgroundColor: 'rgba(232,213,183,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gridBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '500',
  },
  scoreBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(232,213,183,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagBadgeText: {
    color: Colors.accent,
    fontSize: 11,
  },
  locationText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  favoriteTag: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  timerBadge: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  scoreReasonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});

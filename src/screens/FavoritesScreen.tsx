import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useFavorites } from '../hooks/useFavorites';
import { StatsScreen } from './StatsScreen';
import type { FavoriteItem } from '../services/favorites';

const { width } = Dimensions.get('window');
const COLUMN = 2;
const ITEM_GAP = 8;
const ITEM_WIDTH = (width - 32 - ITEM_GAP) / COLUMN;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function getStarConfig(score: number) {
  if (score >= 90) return { stars: 5, color: Colors.success };
  if (score >= 75) return { stars: 4, color: '#8BC34A' };
  if (score >= 60) return { stars: 3, color: '#FFC107' };
  if (score >= 40) return { stars: 2, color: '#FF9800' };
  return { stars: 1, color: Colors.error };
}

function StarRating({ score, size = 12 }: { score: number; size?: number }) {
  const { stars, color } = getStarConfig(score);
  return (
    <Text style={{ fontSize: size, color }}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </Text>
  );
}

function FavoriteCard({ item, onDelete, onPress }: {
  item: FavoriteItem;
  onDelete: (id: string) => void;
  onPress: (item: FavoriteItem) => void;
}) {
  const handleLongPress = () => {
    Alert.alert('删除收藏', '确定要删除这张照片的收藏吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>{item.score}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.gridLabel}>{item.gridType}</Text>
        <StarRating score={item.score} size={11} />
      </View>
      {item.sceneTag ? (
        <View style={styles.sceneTagBadge}>
          <Text style={styles.sceneTagText}>{item.sceneTag}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function FullScreenModal({ item, visible, onClose }: {
  item: FavoriteItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={styles.modalCloseArea} onPress={onClose} activeOpacity={1}>
          <Ionicons name="close-circle" size={36} color="#fff" style={styles.closeIcon} />
        </TouchableOpacity>
        <Image source={{ uri: item.uri }} style={styles.fullImage} resizeMode="contain" />
        <View style={styles.modalInfo}>
          <View style={styles.modalScoreRow}>
            <StarRating score={item.score} size={20} />
            <View style={styles.modalScoreBadge}>
              <Text style={styles.modalScore}>{item.score}</Text>
              <Text style={styles.modalScoreLabel}>分</Text>
            </View>
          </View>
          {item.scoreReason ? (
            <Text style={styles.scoreReason}>{item.scoreReason}</Text>
          ) : null}
          <Text style={styles.modalGrid}>{item.gridType}</Text>
          {item.sceneTag ? (
            <View style={styles.sceneTagBadge}>
              <Text style={styles.sceneTagText}>{item.sceneTag}</Text>
            </View>
          ) : null}
          <Text style={styles.modalDate}>{formatDate(item.date)}</Text>
          {item.suggestion ? (
            <Text style={styles.modalSuggestion}>{item.suggestion}</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function FavoritesScreen() {
  const { favorites, loading, deleteFavorite } = useFavorites();
  const [selectedItem, setSelectedItem] = useState<FavoriteItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);

  if (showStats) {
    return <StatsScreen onBack={() => setShowStats(false)} />;
  }

  const handlePress = (item: FavoriteItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await deleteFavorite(id);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>优秀照片</Text>
          <Text style={styles.subtitle}>收藏夹</Text>
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>优秀照片</Text>
          <TouchableOpacity onPress={() => setShowStats(true)} style={styles.statsBtn}>
            <Text style={styles.statsBtnText}>📊 统计</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>收藏夹 · {favorites.length}张</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="star-outline" size={64} color={Colors.accent} />
          <Text style={styles.emptyTitle}>还没有收藏照片</Text>
          <Text style={styles.emptyHint}>在相机拍摄后点击爱心按钮收藏</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <FavoriteCard item={item} onDelete={handleDelete} onPress={handlePress} />
          )}
        />
      )}

      <FullScreenModal item={selectedItem} visible={modalVisible} onClose={handleCloseModal} />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  statsBtn: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  card: {
    width: ITEM_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbnail: {
    width: '100%',
    height: ITEM_WIDTH,
    backgroundColor: Colors.border,
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  cardFooter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  dateLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeIcon: {
    opacity: 0.9,
  },
  fullImage: {
    width: '100%',
    height: '60%',
  },
  modalInfo: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalScoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  modalScore: {
    color: Colors.accent,
    fontSize: 32,
    fontWeight: '700',
  },
  modalScoreLabel: {
    color: Colors.accent,
    fontSize: 18,
  },
  modalGrid: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  modalDate: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  modalSuggestion: {
    color: Colors.text,
    fontSize: 13,
    marginTop: 12,
    lineHeight: 20,
  },
  sceneTagBadge: {
    backgroundColor: 'rgba(232,213,183,0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  sceneTagText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  scoreReason: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

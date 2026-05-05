import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  loadAnalysisHistory,
  deleteAnalysisRecord,
  clearAnalysisHistory,
} from '../services/analysisHistory';
import type { AnalysisRecord } from '../types';

const { width } = Dimensions.get('window');

function formatDate(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + h + ':' + min;
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return d.getFullYear() + '\u5e74' + (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65e5 ' + h + ':' + m;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '\u2026';
}

interface Props {
  onBack: () => void;
}

export function AnalysisHistoryScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.primary },
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerRowSelect: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText: { color: colors.accent, fontSize: 15 },
    headerTitle: { color: colors.accent, fontSize: 22, fontWeight: '700', letterSpacing: 2 },
    headerSubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
    selectBtn: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    selectBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    cancelBtn: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    cancelBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
    clearBtn: { backgroundColor: colors.error, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    clearBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyTitle: { color: colors.accent, fontSize: 18, fontWeight: '600', marginTop: 8 },
    emptyHint: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardSelected: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.accent,
      marginBottom: 12,
      overflow: 'hidden',
    },
    thumbnail: { width: 80, height: 80, backgroundColor: colors.border },
    cardContent: { flex: 1, padding: 12 },
    cardText: { color: colors.text, fontSize: 13, lineHeight: 18 },
    cardDate: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
    cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    tagBadge: { backgroundColor: 'rgba(232,213,183,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    tagText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
    deleteBtnCard: { justifyContent: 'center', paddingHorizontal: 12 },
    checkbox: { position: 'absolute', top: 8, left: 8, zIndex: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
    modalCloseArea: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '50%' },
    modalContent: { paddingHorizontal: 24, paddingTop: 16 },
    modalText: { color: colors.text, fontSize: 14, lineHeight: 22 },
    modalDate: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
    modalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  }), [colors]);

  const load = async () => {
    setLoading(true);
    const data = await loadAnalysisHistory();
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCardPress = (record: AnalysisRecord) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(record.id)) next.delete(record.id);
        else next.add(record.id);
        return next;
      });
    } else {
      setSelectedRecord(record);
      setModalVisible(true);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAnalysisRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleBatchDelete = () => {
    const count = selectedIds.size;
    Alert.alert(
      '\u627e\u6279\u5220\u9664',
      '\u786e\u5b9a\u5220\u9664 ' + count + ' \u6761\u8bb0\u5f55\uff1f',
      [
        { text: '\u53d6\u6d88', style: 'cancel' },
        {
          text: '\u5220\u9664',
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedIds);
            for (const id of ids) {
              await deleteAnalysisRecord(id);
            }
            setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
            setSelectMode(false);
            setSelectedIds(new Set());
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      '\u6e05\u7a7a\u5386\u53f2',
      '\u786e\u5b9a\u6e05\u7a7a\u6240\u6709\u5206\u6790\u8bb0\u5f55\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64d4\u9500\u3002',
      [
        { text: '\u53d6\u6d88', style: 'cancel' },
        {
          text: '\u6e05\u7a7a',
          style: 'destructive',
          onPress: async () => {
            await clearAnalysisHistory();
            setRecords([]);
          },
        },
      ]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedRecord(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="btn-back">
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
              <Text style={styles.backBtnText}>\u8fd4\u56de</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>\u5206\u6790\u5386\u53f2</Text>
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: AnalysisRecord }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={isSelected ? styles.cardSelected : styles.card}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
        testID={'history-card-' + item.id}
      >
        <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
        <View style={styles.cardContent}>
          <Text style={styles.cardText} numberOfLines={2}>
            {truncate(item.analysisText, 80)}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.timestamp)}</Text>
          {item.tags.length > 0 && (
            <View style={styles.cardTags}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {selectMode && (
          <View style={styles.checkbox}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isSelected ? colors.accent : '#fff'}
            />
          </View>
        )}
        {!selectMode && (
          <TouchableOpacity
            style={styles.deleteBtnCard}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={'delete-' + item.id}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {selectMode ? (
          <>
            <View style={styles.headerRowSelect}>
              <TouchableOpacity style={styles.cancelBtn} onPress={exitSelectMode} testID="btn-cancel">
                <Text style={styles.cancelBtnText}>\u53d6\u6d88</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleBatchDelete}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.clearBtnText}>\u5220\u9664 ({selectedIds.size})</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack} testID="btn-back">
              <Ionicons name="chevron-back" size={20} color={colors.accent} />
              <Text style={styles.backBtnText}>\u8fd4\u56de</Text>
            </TouchableOpacity>
            {records.length > 0 && (
              <>
                <TouchableOpacity style={styles.selectBtn} onPress={() => setSelectMode(true)} testID="btn-select">
                  <Text style={styles.selectBtnText}>\u9009\u62e9</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} testID="btn-clear-all">
                  <Text style={styles.clearBtnText}>\u6e05\u7a7a</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        <Text style={styles.headerTitle}>\u5206\u6790\u5386\u53f2</Text>
        <Text style={styles.headerSubtitle} testID="header-subtitle">\u5386\u53f2\u8bb0\u5f55 \u00b7 {records.length}\u6761</Text>
      </View>

      {records.length === 0 ? (
        <View style={styles.centerState}>
          <Ionicons name="time-outline" size={64} color={colors.accent} />
          <Text style={styles.emptyTitle} testID="empty-title">\u8fd8\u6ca1\u6709\u5206\u6790\u8bb0\u5f55</Text>
          <Text style={styles.emptyHint}>\u5728\u9996\u9875\u9009\u62e9\u7167\u7247\u8fdb\u884cAI\u5206\u6790\u540e\uff0c\u8bb0\u5f55\u4f1a\u4fdd\u5b58\u5728\u8fd9\u91cc</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={closeModal} activeOpacity={1}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedRecord && (
            <>
              <Image source={{ uri: selectedRecord.imageUri }} style={styles.fullImage} resizeMode="contain" />
              <View style={styles.modalContent}>
                <Text style={styles.modalText} testID="modal-analysis-text">{selectedRecord.analysisText}</Text>
                <Text style={styles.modalDate}>{formatDateFull(selectedRecord.timestamp)}</Text>
                {selectedRecord.tags.length > 0 && (
                  <View style={styles.modalTags}>
                    {selectedRecord.tags.map((tag) => (
                      <View key={tag} style={styles.tagBadge}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalysisRecord } from '../types';

const STORAGE_KEY = '@photo_advisor_analysis_history';
const MAX_RECORDS = 50;

export async function loadAnalysisHistory(): Promise<AnalysisRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalysisRecord[];
  } catch {
    return [];
  }
}

export async function saveAnalysisHistory(records: AnalysisRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function addAnalysisRecord(
  record: Omit<AnalysisRecord, 'id' | 'timestamp'>
): Promise<AnalysisRecord[]> {
  const existing = await loadAnalysisHistory();
  const newRecord: AnalysisRecord = {
    ...record,
    id: generateAnalysisId(),
    timestamp: new Date().toISOString(),
  };
  // FIFO: drop oldest (lowest index) when exceeding MAX_RECORDS
  const combined = [newRecord, ...existing];
  const updated = combined.length > MAX_RECORDS
    ? combined.slice(0, MAX_RECORDS)
    : combined;
  await saveAnalysisHistory(updated);
  return updated;
}

export async function deleteAnalysisRecord(id: string): Promise<AnalysisRecord[]> {
  const existing = await loadAnalysisHistory();
  const updated = existing.filter((r) => r.id !== id);
  await saveAnalysisHistory(updated);
  return updated;
}

export async function clearAnalysisHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function generateAnalysisId(): string {
  return `ana_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
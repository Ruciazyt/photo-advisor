import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ShootLogEntry } from '../types';

export type { ShootLogEntry };

const STORAGE_KEY = '@photo_advisor_shoot_log';

export async function loadLog(): Promise<ShootLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShootLogEntry[];
  } catch {
    return [];
  }
}

export async function saveLog(entries: ShootLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addEntry(entry: ShootLogEntry): Promise<void> {
  const existing = await loadLog();
  const updated = [entry, ...existing];
  await saveLog(updated);
}

export async function clearLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function deleteEntry(id: string): Promise<void> {
  const existing = await loadLog();
  const updated = existing.filter((e) => e.id !== id);
  await saveLog(updated);
}

export async function deleteEntries(ids: string[]): Promise<void> {
  const existing = await loadLog();
  const idSet = new Set(ids);
  const updated = existing.filter((e) => !idSet.has(e.id));
  await saveLog(updated);
}

export function generateId(): string {
  return `shoot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

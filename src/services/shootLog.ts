import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@photo_advisor_shoot_log';

export interface ShootLogEntry {
  id: string;
  date: string; // ISO timestamp
  gridType: string; // 'thirds' | 'golden' | 'diagonal' | 'spiral' | 'none'
  score?: number; // 0-100, AI-computed score
  scoreReason?: string; // brief AI reason
  sceneTag?: string; // scene label
  locationName?: string; // human-readable location
  timerDuration?: number; // 0, 3, 5, 10 seconds
  wasFavorite: boolean; // did user save to favorites
  thumbnailUri?: string; // small thumbnail URI (optional)
  suggestions: string[]; // AI suggestions received
}

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

export function generateId(): string {
  return `shoot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

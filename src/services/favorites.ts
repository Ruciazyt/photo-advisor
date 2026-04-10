import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@photo_advisor_favorites';

export interface FavoriteItem {
  id: string;
  uri: string;
  score: number;
  date: string;
  gridType: string;
  suggestion: string;
  sceneTag?: string;
}

export async function loadFavorites(): Promise<FavoriteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteItem[];
  } catch {
    return [];
  }
}

export async function saveFavorites(items: FavoriteItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function addFavorite(item: FavoriteItem): Promise<FavoriteItem[]> {
  const existing = await loadFavorites();
  const updated = [item, ...existing];
  await saveFavorites(updated);
  return updated;
}

export async function removeFavorite(id: string): Promise<FavoriteItem[]> {
  const existing = await loadFavorites();
  const updated = existing.filter((f) => f.id !== id);
  await saveFavorites(updated);
  return updated;
}

export function generateFavoriteId(): string {
  return `fav_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

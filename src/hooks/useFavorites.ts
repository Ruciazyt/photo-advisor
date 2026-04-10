import { useState, useEffect, useCallback } from 'react';
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  generateFavoriteId,
  type FavoriteItem,
} from '../services/favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const items = await loadFavorites();
    // Sort by score descending
    items.sort((a, b) => b.score - a.score);
    setFavorites(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveFavorite = useCallback(
    async (uri: string, gridType: string, suggestion: string = '', sceneTag?: string, score?: number, scoreReason?: string) => {
      const item: FavoriteItem = {
        id: generateFavoriteId(),
        uri,
        score: score ?? 85,
        scoreReason,
        date: new Date().toISOString(),
        gridType,
        suggestion,
        sceneTag,
      };
      const updated = await addFavorite(item);
      updated.sort((a, b) => b.score - a.score);
      setFavorites(updated);
      return item;
    },
    []
  );

  const deleteFavorite = useCallback(async (id: string) => {
    const updated = await removeFavorite(id);
    setFavorites(updated);
  }, []);

  return {
    favorites,
    loading,
    saveFavorite,
    deleteFavorite,
    refresh,
  };
}

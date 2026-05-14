import { useState, useEffect, useCallback } from 'react';
import {
  loadLog,
  addEntry,
  clearLog as clearLogService,
  deleteEntry as deleteEntryService,
  deleteEntries as deleteEntriesService,
  generateId,
  type ShootLogEntry,
} from '../services/shootLog';

export function useShootLog(): {
  log: ShootLogEntry[];
  loading: boolean;
  addEntry: (entry: Omit<ShootLogEntry, 'id' | 'date'>) => void;
  clearLog: () => void;
  deleteEntry: (id: string) => Promise<void>;
  deleteEntries: (ids: string[]) => Promise<void>;
  totalShoots: number;
  avgScore: number;
  favoriteCount: number;
} {
  const [log, setLog] = useState<ShootLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await loadLog();
      setLog(entries);
    } catch {
      setLog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddEntry = useCallback(
    (entry: Omit<ShootLogEntry, 'id' | 'date'>) => {
      const newEntry: ShootLogEntry = {
        ...entry,
        id: generateId(),
        date: new Date().toISOString(),
      };
      addEntry(newEntry).then(() => {
        setLog((prev) => [newEntry, ...prev]);
      });
    },
    []
  );

  const handleClearLog = useCallback(() => {
    clearLogService().then(() => {
      setLog([]);
    });
  }, []);

  const handleDeleteEntry = useCallback(async (id: string): Promise<void> => {
    await deleteEntryService(id);
    setLog((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleDeleteEntries = useCallback(async (ids: string[]): Promise<void> => {
    await deleteEntriesService(ids);
    const idSet = new Set(ids);
    setLog((prev) => prev.filter((e) => !idSet.has(e.id)));
  }, []);

  const totalShoots = log.length;

  const scoredEntries = log.filter((e) => e.score !== undefined && e.score !== null);
  const avgScore =
    scoredEntries.length > 0
      ? Math.round(scoredEntries.reduce((sum, e) => sum + (e.score ?? 0), 0) / scoredEntries.length)
      : 0;

  const favoriteCount = log.filter((e) => e.wasFavorite).length;

  return {
    log,
    loading,
    addEntry: handleAddEntry,
    clearLog: handleClearLog,
    deleteEntry: handleDeleteEntry,
    deleteEntries: handleDeleteEntries,
    totalShoots,
    avgScore,
    favoriteCount,
  };
}

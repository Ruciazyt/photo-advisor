/**
 * Data Export / Backup / Restore Service
 *
 * Allows users to export favorites and shoot log to a JSON file via the system
 * share sheet, and restore data from a shared JSON file.
 */

import * as FileSystem from 'expo-file-system/legacy';
import Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { loadFavorites, saveFavorites } from './favorites';
import { loadLog, saveLog, clearLog } from './shootLog';
import { AppError } from './errors';
import type { FavoriteItem, ShootLogEntry, StatsSummary } from '../types';

const CURRENT_VERSION = '1.1.0';

export interface ExportedData {
  version: string;
  exportedAt: string;
  favorites: FavoriteItem[];
  shootLog: ShootLogEntry[];
  stats: StatsSummary;
}

/**
 * Build the JSON string for export (does NOT include stats to reduce size).
 * The stats field is present in the type but null at runtime for the JSON payload.
 */
export function buildExportJson(): Promise<string> {
  return Promise.all([loadFavorites(), loadLog()]).then(([favorites, shootLog]) => {
    const payload: Omit<ExportedData, 'stats'> & { stats: null } = {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      favorites,
      shootLog,
      stats: null,
    };
    return JSON.stringify(payload, null, 2);
  });
}

/**
 * Export all data as a JSON file and invoke the system share sheet.
 * @returns true if the share sheet was presented, false if the user cancelled
 *          or sharing is not available.
 */
export async function exportAllData(): Promise<boolean> {
  const json = await buildExportJson();

  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const filename = `photo-advisor-backup-${timestamp}.json`;

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    // Clean up temp file
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    return false;
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: '导出拍摄参谋数据',
    });
    return true;
  } catch (e) {
    // User cancelled the share sheet — not an error
    return false;
  } finally {
    // Best-effort cleanup of temp file
    FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
}

/**
 * Import data from an ExportedData object, merging into existing data.
 * - favorites: skips entries whose id already exists, appends new ones
 * - shootLog: skips entries whose id already exists, appends new ones
 * @returns the number of newly imported items and the number skipped
 */
export async function importData(data: ExportedData): Promise<{ imported: number; skipped: number }> {
  // Validate required fields
  if (!data || typeof data !== 'object') {
    throw new AppError('导入数据格式无效', 'DATA_IMPORT_FAILED' as any, 'error', false, 'importData');
  }
  if (!Array.isArray(data.favorites)) {
    throw new AppError('导入数据格式无效：缺少收藏夹数据', 'DATA_IMPORT_FAILED' as any, 'error', false, 'importData');
  }
  if (!Array.isArray(data.shootLog)) {
    throw new AppError('导入数据格式无效：缺少拍摄日志数据', 'DATA_IMPORT_FAILED' as any, 'error', false, 'importData');
  }

  const [existingFavorites, existingLog] = await Promise.all([
    loadFavorites(),
    loadLog(),
  ]);

  const existingFavoriteIds = new Set(existingFavorites.map((f) => f.id));
  const existingLogIds = new Set(existingLog.map((e) => e.id));

  const newFavorites: FavoriteItem[] = [];
  const newLog: ShootLogEntry[] = [];

  let skipped = 0;

  for (const fav of data.favorites) {
    if (existingFavoriteIds.has(fav.id)) {
      skipped++;
    } else {
      newFavorites.push(fav);
    }
  }

  for (const entry of data.shootLog) {
    if (existingLogIds.has(entry.id)) {
      skipped++;
    } else {
      newLog.push(entry);
    }
  }

  const imported = newFavorites.length + newLog.length;

  if (newFavorites.length > 0) {
    await saveFavorites([...existingFavorites, ...newFavorites]);
  }
  if (newLog.length > 0) {
    await saveLog([...existingLog, ...newLog]);
  }

  return { imported, skipped };
}

/**
 * Pick a JSON backup file using the system document picker and import its data.
 * Returns null if the user cancelled the picker.
 */
export async function importFromFile(): Promise<{ imported: number; skipped: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const fileUri = result.assets[0].uri;

  let jsonString: string;
  try {
    jsonString = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    throw new AppError('无法读取文件内容', 'DATA_IMPORT_FAILED' as any, 'error', false, 'importFromFile');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new AppError('JSON 解析失败，请选择有效的备份文件', 'DATA_IMPORT_FAILED' as any, 'error', false, 'importFromFile');
  }

  return importData(parsed as ExportedData);
}

/**
 * Clear ALL stored data (favorites and shoot log).
 * Use with caution — this is irreversible.
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    saveFavorites([]),
    clearLog(),
  ]);
}

/**
 * Unit tests for src/services/analysisHistory.ts
 * Tests: loadAnalysisHistory, saveAnalysisHistory, addAnalysisRecord,
 *        deleteAnalysisRecord, clearAnalysisHistory, generateAnalysisId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import {
  loadAnalysisHistory,
  saveAnalysisHistory,
  addAnalysisRecord,
  deleteAnalysisRecord,
  clearAnalysisHistory,
  generateAnalysisId,
} from '../services/analysisHistory';
import type { AnalysisRecord } from '../types';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const sampleRecord: Omit<AnalysisRecord, 'id' | 'timestamp'> = {
  imageUri: 'file:///test/photo.jpg',
  analysisText: '构图优秀，光线充足',
  tags: ['风景', '户外'],
};

describe('generateAnalysisId', () => {
  it('generates an id string starting with ana_', () => {
    const id = generateAnalysisId();
    expect(id).toMatch(/^ana_\d+_[a-z0-9]+$/);
  });

  it('generates different ids on successive calls', () => {
    const ids = new Set([generateAnalysisId(), generateAnalysisId(), generateAnalysisId()]);
    expect(ids.size).toBe(3);
  });
});

describe('loadAnalysisHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when nothing is stored', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await loadAnalysisHistory();
    expect(result).toEqual([]);
  });

  it('parses and returns stored records', async () => {
    const stored: AnalysisRecord[] = [
      { id: 'ana_1', imageUri: 'file:///a.jpg', analysisText: '好', timestamp: '2026-05-01T10:00:00Z', tags: [] },
    ];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));
    const result = await loadAnalysisHistory();
    expect(result).toEqual(stored);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@photo_advisor_analysis_history');
  });

  it('returns empty array on JSON parse error', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('invalid json');
    const result = await loadAnalysisHistory();
    expect(result).toEqual([]);
  });

  it('returns empty array when getItem throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const result = await loadAnalysisHistory();
    expect(result).toEqual([]);
  });
});

describe('saveAnalysisHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('stores a JSON-serialized array', async () => {
    const records: AnalysisRecord[] = [
      { id: 'ana_1', imageUri: 'file:///a.jpg', analysisText: '好', timestamp: '2026-05-01T10:00:00Z', tags: [] },
    ];
    await saveAnalysisHistory(records);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      '@photo_advisor_analysis_history',
      JSON.stringify(records)
    );
  });

  it('stores empty array correctly', async () => {
    await saveAnalysisHistory([]);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@photo_advisor_analysis_history', '[]');
  });
});

describe('addAnalysisRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('prepends new record to existing list', async () => {
    const existing: AnalysisRecord[] = [
      { id: 'ana_old', imageUri: 'file:///old.jpg', analysisText: '旧', timestamp: '2026-05-01T10:00:00Z', tags: [] },
    ];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await addAnalysisRecord(sampleRecord);
    expect(result[0].imageUri).toBe(sampleRecord.imageUri);
    expect(result[0].analysisText).toBe(sampleRecord.analysisText);
    expect(result[0].tags).toEqual(sampleRecord.tags);
    expect(result[0].id).toMatch(/^ana_/);
    expect(result[0].timestamp).toBeTruthy();
    expect(result[1]).toEqual(existing[0]);
  });

  it('prepends when existing list is empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await addAnalysisRecord(sampleRecord);
    expect(result).toHaveLength(1);
    expect(result[0].imageUri).toBe(sampleRecord.imageUri);
  });

  it('enforces MAX_RECORDS limit of 50 (keeps newest, drops oldest when full)', async () => {
    const existing: AnalysisRecord[] = Array.from({ length: 50 }, (_, i) => ({
      id: `ana_old_${i}`,
      imageUri: `file:///old_${i}.jpg`,
      analysisText: `旧记录 ${i}`,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
      tags: [],
    }));
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await addAnalysisRecord(sampleRecord);
    expect(result).toHaveLength(50);
    // result[0] = new record (newest)
    expect(result[0].id).toMatch(/^ana_/);
    // ana_old_49 (newest original) is dropped when we exceed 50
    expect(result.find((r) => r.id === 'ana_old_49')).toBeUndefined();
    // ana_old_0 (oldest original) is still present since we keep indices 1-49
    expect(result.find((r) => r.id === 'ana_old_0')).toBeTruthy();
  });

  it('saves the updated list to storage', async () => {
    await addAnalysisRecord(sampleRecord);
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });
});

describe('deleteAnalysisRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('removes the record with the given id', async () => {
    const existing: AnalysisRecord[] = [
      { id: 'ana_1', imageUri: 'file:///a.jpg', analysisText: 'A', timestamp: '2026-05-01T10:00:00Z', tags: [] },
      { id: 'ana_2', imageUri: 'file:///b.jpg', analysisText: 'B', timestamp: '2026-05-01T11:00:00Z', tags: [] },
    ];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deleteAnalysisRecord('ana_1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ana_2');
  });

  it('returns empty array when list is empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    const result = await deleteAnalysisRecord('any_id');
    expect(result).toHaveLength(0);
  });

  it('does not remove records with different ids', async () => {
    const existing: AnalysisRecord[] = [
      { id: 'ana_1', imageUri: 'file:///a.jpg', analysisText: 'A', timestamp: '2026-05-01T10:00:00Z', tags: [] },
    ];
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
    const result = await deleteAnalysisRecord('non_existent');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ana_1');
  });

  it('saves the updated list to storage', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    await deleteAnalysisRecord('any_id');
    expect(mockAsyncStorage.setItem).toHaveBeenCalled();
  });
});

describe('clearAnalysisHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it('removes the storage key', async () => {
    await clearAnalysisHistory();
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@photo_advisor_analysis_history');
  });
});

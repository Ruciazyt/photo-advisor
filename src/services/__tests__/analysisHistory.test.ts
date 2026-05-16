/**
 * Tests for analysisHistory service — history records for analyzed photos.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadAnalysisHistory,
  saveAnalysisHistory,
  addAnalysisRecord,
  deleteAnalysisRecord,
  clearAnalysisHistory,
  generateAnalysisId,
} from '../analysisHistory';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const SAMPLE_RECORD = {
  uri: 'file:///photo.jpg',
  score: 85,
  grade: 'A' as const,
  suggestion: '构图不错',
  sceneTag: '风景',
};

describe('analysisHistory service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('loadAnalysisHistory', () => {
    it('returns empty array when no data stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await loadAnalysisHistory();
      expect(result).toEqual([]);
    });

    it('parses and returns stored records sorted newest-first', async () => {
      const stored = [
        { id: 'ana_1', uri: 'file:///a.jpg', score: 80, grade: 'B', suggestion: '', sceneTag: '', timestamp: '2026-01-01T10:00:00Z' },
        { id: 'ana_2', uri: 'file:///b.jpg', score: 90, grade: 'A', suggestion: '', sceneTag: '', timestamp: '2026-01-02T10:00:00Z' },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(stored));
      const result = await loadAnalysisHistory();
      expect(result).toHaveLength(2);
    });

    it('returns empty array on JSON parse error', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('not valid json');
      const result = await loadAnalysisHistory();
      expect(result).toEqual([]);
    });
  });

  describe('saveAnalysisHistory', () => {
    it('stores records as JSON string via AsyncStorage.setItem', async () => {
      const records = [{ id: 'ana_1', uri: 'file:///a.jpg', score: 75, grade: 'C', suggestion: '', sceneTag: '', timestamp: '2026-01-01T00:00:00Z' }];
      await saveAnalysisHistory(records);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@photo_advisor_analysis_history',
        JSON.stringify(records)
      );
    });

    it('setItem receives undefined when called with no arguments', async () => {
      await saveAnalysisHistory([]);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@photo_advisor_analysis_history',
        '[]'
      );
    });
  });

  describe('addAnalysisRecord', () => {
    it('generates id and timestamp, prepends to existing records', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([
        { id: 'ana_existing', uri: 'file:///old.jpg', score: 70, grade: 'C', suggestion: '', sceneTag: '', timestamp: '2026-01-01T00:00:00Z' }
      ]));

      const result = await addAnalysisRecord(SAMPLE_RECORD);

      expect(result[0].id).toMatch(/^ana_\d+_[a-z0-9]+$/);
      expect(result[0].uri).toBe(SAMPLE_RECORD.uri);
      expect(result[0].score).toBe(SAMPLE_RECORD.score);
      expect(result[0].grade).toBe(SAMPLE_RECORD.grade);
      expect(result[0].suggestion).toBe(SAMPLE_RECORD.suggestion);
      expect(result[0].sceneTag).toBe(SAMPLE_RECORD.sceneTag);
      expect(result[0].timestamp).toBeDefined();
      // existing record should be second
      expect(result[1].id).toBe('ana_existing');
    });

    it('returns empty array when no existing records and new record added', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await addAnalysisRecord(SAMPLE_RECORD);
      expect(result).toHaveLength(1);
      expect(result[0].uri).toBe('file:///photo.jpg');
    });

    it('caps records at MAX_RECORDS (50), dropping oldest', async () => {
      // Create 50 existing records
      const existing = Array.from({ length: 50 }, (_, i) => ({
        id: `ana_existing_${i}`,
        uri: `file:///existing_${i}.jpg`,
        score: 70 + i,
        grade: 'C' as const,
        suggestion: '',
        sceneTag: '',
        timestamp: new Date(2026, 0, i + 1).toISOString(),
      }));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));

      const result = await addAnalysisRecord(SAMPLE_RECORD);

      // New record prepended, existing[0] dropped (combined was 51, sliced to 50)
      expect(result).toHaveLength(50);
      expect(result[0].uri).toBe(SAMPLE_RECORD.uri); // newest
      expect(result[1].id).toBe('ana_existing_0'); // existing[0] kept (was at index 1 after prepend)
      expect(result[49].id).toBe('ana_existing_48'); // existing[48] at last position
      expect(result.some(r => r.id === 'ana_existing_49')).toBe(false); // existing[49] was dropped
    });

    it('new record is placed at index 0 (newest first)', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await addAnalysisRecord(SAMPLE_RECORD);
      expect(result[0].uri).toBe('file:///photo.jpg');
    });
  });

  describe('deleteAnalysisRecord', () => {
    it('removes record with matching id', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([
        { id: 'ana_1', uri: 'file:///a.jpg', score: 80, grade: 'B', suggestion: '', sceneTag: '', timestamp: '2026-01-01T00:00:00Z' },
        { id: 'ana_2', uri: 'file:///b.jpg', score: 90, grade: 'A', suggestion: '', sceneTag: '', timestamp: '2026-01-02T00:00:00Z' },
      ]));

      const result = await deleteAnalysisRecord('ana_1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ana_2');
    });

    it('returns all records unchanged when id not found', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([
        { id: 'ana_2', uri: 'file:///b.jpg', score: 90, grade: 'A', suggestion: '', sceneTag: '', timestamp: '2026-01-02T00:00:00Z' },
      ]));

      const result = await deleteAnalysisRecord('non_existent_id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ana_2');
    });

    it('saves updated list after deletion', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([
        { id: 'ana_1', uri: 'file:///a.jpg', score: 80, grade: 'B', suggestion: '', sceneTag: '', timestamp: '2026-01-01T00:00:00Z' },
      ]));

      await deleteAnalysisRecord('ana_1');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@photo_advisor_analysis_history',
        '[]'
      );
    });
  });

  describe('clearAnalysisHistory', () => {
    it('removes the storage key', async () => {
      await clearAnalysisHistory();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@photo_advisor_analysis_history');
    });
  });

  describe('generateAnalysisId', () => {
    it('generates unique IDs each call', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateAnalysisId());
      }
      // All 100 should be unique
      expect(ids.size).toBe(100);
    });

    it('starts with "ana_" prefix', () => {
      const id = generateAnalysisId();
      expect(id.startsWith('ana_')).toBe(true);
    });

    it('contains timestamp and random suffix', () => {
      const id = generateAnalysisId();
      const parts = id.split('_');
      expect(parts.length).toBe(3); // ana_<timestamp>_<random>
      expect(parts[1]).toMatch(/^\d+$/); // timestamp is numeric
      expect(parts[2].length).toBeGreaterThan(0); // random suffix non-empty
    });
  });
});
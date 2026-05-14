/**
 * Unit tests for src/hooks/useShootLog.ts
 *
 * Mocks: services/shootLog (loadLog, addEntry, clearLog, deleteEntry, deleteEntries, generateId)
 */

jest.mock('../../services/shootLog', () => ({
  loadLog: jest.fn(),
  addEntry: jest.fn(() => Promise.resolve()),
  clearLog: jest.fn(() => Promise.resolve()),
  deleteEntry: jest.fn(() => Promise.resolve()),
  deleteEntries: jest.fn(() => Promise.resolve()),
  generateId: jest.fn(() => 'mock_shoot_id_456'),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useShootLog } from '../useShootLog';
import { loadLog, addEntry, clearLog as clearLogService, deleteEntry as deleteEntryService, deleteEntries as deleteEntriesService } from '../../services/shootLog';

const mockLoadLog = loadLog as jest.Mock;
const mockAddEntry = addEntry as jest.Mock;
const mockClearLog = clearLogService as jest.Mock;
const mockDeleteEntry = deleteEntryService as jest.Mock;
const mockDeleteEntries = deleteEntriesService as jest.Mock;

const sampleEntries = [
  { id: 's1', uri: 'file:///a.jpg', score: 80, wasFavorite: true, date: '2024-01-01T00:00:00.000Z', gridType: 'thirds', suggestion: 'sug1', sceneTag: 'portrait', thumbnailUri: undefined },
  { id: 's2', uri: 'file:///b.jpg', score: 95, wasFavorite: false, date: '2024-01-02T00:00:00.000Z', gridType: 'golden', suggestion: 'sug2', sceneTag: 'landscape', thumbnailUri: undefined },
  { id: 's3', uri: 'file:///c.jpg', score: 60, wasFavorite: true, date: '2024-01-03T00:00:00.000Z', gridType: 'diagonal', suggestion: 'sug3', sceneTag: 'food', thumbnailUri: undefined },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadLog.mockResolvedValue([]);
  mockAddEntry.mockResolvedValue();
  mockClearLog.mockResolvedValue();
  mockDeleteEntry.mockResolvedValue();
  mockDeleteEntries.mockResolvedValue();
});

describe('initial state', () => {
  it('starts with empty log and loading=true', async () => {
    mockLoadLog.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 50)));

    const { result } = renderHook(() => useShootLog());

    expect(result.current.log).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('loadLog integration', () => {
  it('loads log entries on mount', async () => {
    mockLoadLog.mockResolvedValue(sampleEntries);

    const { result } = renderHook(() => useShootLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.log).toHaveLength(3);
  });

  it('sets loading=false even if loadLog rejects', async () => {
    mockLoadLog.mockRejectedValue(new Error('storage error'));

    const { result } = renderHook(() => useShootLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.log).toEqual([]);
  });
});

describe('addEntry', () => {
  it('calls addEntry service with a generated id and date', async () => {
    mockAddEntry.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.addEntry({ uri: 'file:///new.jpg', score: 85, wasFavorite: false, gridType: 'thirds', suggestion: 'test', sceneTag: 'portrait', thumbnailUri: undefined });
    });

    // The addEntry service is called asynchronously inside a then()
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(mockAddEntry).toHaveBeenCalledTimes(1);
    const addedEntry = mockAddEntry.mock.calls[0][0];
    expect(addedEntry.uri).toBe('file:///new.jpg');
    expect(addedEntry.score).toBe(85);
    expect(addedEntry.id).toBe('mock_shoot_id_456');
    expect(addedEntry.date).toBeDefined();
  });

  it('prepends new entry to log', async () => {
    mockLoadLog.mockResolvedValue(sampleEntries);
    mockAddEntry.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.addEntry({ uri: 'file:///new.jpg', score: 99, wasFavorite: true, gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined });
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    // New entry prepended at front
    expect(result.current.log[0].uri).toBe('file:///new.jpg');
    expect(result.current.log[0].score).toBe(99);
  });
});

describe('deleteEntry', () => {
  it('calls deleteEntry service with the given id', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockDeleteEntry.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteEntry('s1');
    });

    expect(mockDeleteEntry).toHaveBeenCalledWith('s1');
  });

  it('removes the entry from log state', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockDeleteEntry.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteEntry('s1');
    });

    expect(result.current.log.find(e => e.id === 's1')).toBeUndefined();
    expect(result.current.log).toHaveLength(2);
  });
});

describe('deleteEntries', () => {
  it('calls deleteEntries service with array of ids', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockDeleteEntries.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteEntries(['s1', 's2']);
    });

    expect(mockDeleteEntries).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('removes multiple entries from log state', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockDeleteEntries.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteEntries(['s1', 's3']);
    });

    expect(result.current.log).toHaveLength(1);
    expect(result.current.log[0].id).toBe('s2');
  });
});

describe('clearLog', () => {
  it('calls clearLog service', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockClearLog.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.clearLog();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(mockClearLog).toHaveBeenCalledTimes(1);
  });

  it('clears log state', async () => {
    mockLoadLog.mockResolvedValue([...sampleEntries]);
    mockClearLog.mockResolvedValue();

    const { result } = renderHook(() => useShootLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.clearLog();
    });

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(result.current.log).toEqual([]);
  });
});

describe('computed values', () => {
  describe('totalShoots', () => {
    it('equals log length', async () => {
      mockLoadLog.mockResolvedValue(sampleEntries);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalShoots).toBe(3);
    });

    it('is 0 for empty log', async () => {
      mockLoadLog.mockResolvedValue([]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.totalShoots).toBe(0);
    });
  });

  describe('avgScore', () => {
    it('calculates mean of scored entries, rounded', async () => {
      mockLoadLog.mockResolvedValue(sampleEntries);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Scores: 80, 95, 60 → sum=235, count=3 → avg=78.33 → rounded=78
      expect(result.current.avgScore).toBe(78);
    });

    it('is 0 when no entries have scores', async () => {
      mockLoadLog.mockResolvedValue([
        { id: 's1', uri: 'file:///a.jpg', score: undefined, wasFavorite: false, date: '2024-01-01T00:00:00.000Z', gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined },
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.avgScore).toBe(0);
    });

    it('is 0 for empty log', async () => {
      mockLoadLog.mockResolvedValue([]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.avgScore).toBe(0);
    });

    it('handles null scores as 0 in calculation', async () => {
      mockLoadLog.mockResolvedValue([
        { id: 's1', uri: 'file:///a.jpg', score: null, wasFavorite: false, date: '2024-01-01T00:00:00.000Z', gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined },
        { id: 's2', uri: 'file:///b.jpg', score: 90, wasFavorite: false, date: '2024-01-02T00:00:00.000Z', gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined },
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.avgScore).toBe(90);
    });
  });

  describe('favoriteCount', () => {
    it('counts entries where wasFavorite=true', async () => {
      mockLoadLog.mockResolvedValue(sampleEntries);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // s1 wasFavorite=true, s2=false, s3=true → count=2
      expect(result.current.favoriteCount).toBe(2);
    });

    it('is 0 when no entries are favorites', async () => {
      mockLoadLog.mockResolvedValue([
        { id: 's1', uri: 'file:///a.jpg', score: 80, wasFavorite: false, date: '2024-01-01T00:00:00.000Z', gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined },
        { id: 's2', uri: 'file:///b.jpg', score: 70, wasFavorite: false, date: '2024-01-02T00:00:00.000Z', gridType: 'thirds', suggestion: '', sceneTag: '', thumbnailUri: undefined },
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.favoriteCount).toBe(0);
    });

    it('is 0 for empty log', async () => {
      mockLoadLog.mockResolvedValue([]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.favoriteCount).toBe(0);
    });
  });
});

describe('returned shape', () => {
  it('returns log, loading, addEntry, clearLog, deleteEntry, deleteEntries, totalShoots, avgScore, favoriteCount', () => {
    const { result } = renderHook(() => useShootLog());
    expect(result.current).toMatchObject({
      log: expect.any(Array),
      loading: expect.any(Boolean),
      addEntry: expect.any(Function),
      clearLog: expect.any(Function),
      deleteEntry: expect.any(Function),
      deleteEntries: expect.any(Function),
      totalShoots: expect.any(Number),
      avgScore: expect.any(Number),
      favoriteCount: expect.any(Number),
    });
  });
});
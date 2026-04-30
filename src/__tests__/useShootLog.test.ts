/**
 * Tests for useShootLog hook — manages shoot log state and computed values.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useShootLog } from '../hooks/useShootLog';
import type { ShootLogEntry } from '../services/shootLog';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock shootLog service
const mockLoadLog = jest.fn();
const mockAddEntry = jest.fn();
const mockClearLog = jest.fn();
const mockDeleteEntry = jest.fn();
const mockDeleteEntries = jest.fn();
const mockGenerateId = jest.fn();

jest.mock('../services/shootLog', () => ({
  loadLog: (...args: unknown[]) => mockLoadLog(...args),
  addEntry: (...args: unknown[]) => mockAddEntry(...args),
  clearLog: (...args: unknown[]) => mockClearLog(...args),
  deleteEntry: (...args: unknown[]) => mockDeleteEntry(...args),
  deleteEntries: (...args: unknown[]) => mockDeleteEntries(...args),
  generateId: (...args: unknown[]) => mockGenerateId(...args),
}));

describe('useShootLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadLog.mockResolvedValue([]);
    mockAddEntry.mockResolvedValue(undefined);
    mockClearLog.mockResolvedValue(undefined);
    mockDeleteEntry.mockResolvedValue(undefined);
    mockDeleteEntries.mockResolvedValue(undefined);
    mockGenerateId.mockReturnValue('shoot_test_123');
  });

  describe('initial loading state', () => {
    it('starts with loading true initially', async () => {
      mockLoadLog.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 100)));
      const { result } = renderHook(() => useShootLog());
      expect(result.current.loading).toBe(true);
    });

    it('starts with empty log initially', async () => {
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.log).toEqual([]);
    });
  });

  describe('loading finishes with empty log', () => {
    it('loading becomes false after loading empty log', async () => {
      mockLoadLog.mockResolvedValue([]);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.loading).toBe(false);
    });

    it('totalShoots is 0 with empty log', async () => {
      mockLoadLog.mockResolvedValue([]);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.totalShoots).toBe(0);
    });

    it('avgScore is 0 with empty log', async () => {
      mockLoadLog.mockResolvedValue([]);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.avgScore).toBe(0);
    });

    it('favoriteCount is 0 with empty log', async () => {
      mockLoadLog.mockResolvedValue([]);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.favoriteCount).toBe(0);
    });
  });

  describe('loading finishes with entries', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('loads entries correctly', async () => {
      const entries = [
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.log).toHaveLength(2);
      expect(result.current.log[0].id).toBe('shoot_1');
    });

    it('calculates totalShoots correctly', async () => {
      const entries = [
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
        createEntry({ id: 'shoot_3' }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.totalShoots).toBe(3);
    });

    it('calculates avgScore correctly', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', score: 80 }),
        createEntry({ id: 'shoot_2', score: 90 }),
        createEntry({ id: 'shoot_3', score: 70 }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // (80 + 90 + 70) / 3 = 80
      expect(result.current.avgScore).toBe(80);
    });

    it('calculates favoriteCount correctly', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', wasFavorite: true }),
        createEntry({ id: 'shoot_2', wasFavorite: false }),
        createEntry({ id: 'shoot_3', wasFavorite: true }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.favoriteCount).toBe(2);
    });
  });

  describe('avgScore calculation', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('returns 0 when no entries have scores', async () => {
      const entries = [
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.avgScore).toBe(0);
    });

    it('handles entries with undefined score', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', score: undefined }),
        createEntry({ id: 'shoot_2', score: undefined }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.avgScore).toBe(0);
    });

    it('handles entries with null score', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', score: null as unknown as undefined }),
        createEntry({ id: 'shoot_2', score: null as unknown as undefined }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.avgScore).toBe(0);
    });

    it('rounds avgScore to nearest integer', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', score: 85 }),
        createEntry({ id: 'shoot_2', score: 86 }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      // (85 + 86) / 2 = 85.5 -> rounds to 86
      expect(result.current.avgScore).toBe(86);
    });

    it('calculates avgScore with only some entries scored', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', score: 100 }),
        createEntry({ id: 'shoot_2' }), // no score
        createEntry({ id: 'shoot_3' }), // no score
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.avgScore).toBe(100);
    });
  });

  describe('favoriteCount calculation', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('returns 0 when no entries were favorites', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', wasFavorite: false }),
        createEntry({ id: 'shoot_2', wasFavorite: false }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.favoriteCount).toBe(0);
    });

    it('counts all entries with wasFavorite true', async () => {
      const entries = [
        createEntry({ id: 'shoot_1', wasFavorite: true }),
        createEntry({ id: 'shoot_2', wasFavorite: true }),
        createEntry({ id: 'shoot_3', wasFavorite: true }),
      ];
      mockLoadLog.mockResolvedValue(entries);
      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.favoriteCount).toBe(3);
    });
  });

  describe('addEntry', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('prepends new entry to log', async () => {
      mockLoadLog.mockResolvedValue([createEntry({ id: 'existing_1' })]);
      mockGenerateId.mockReturnValue('new_id');

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addEntry({ gridType: '黄金分割', wasFavorite: true, suggestions: [] });
      });

      expect(result.current.log).toHaveLength(2);
      expect(result.current.log[0].id).toBe('new_id');
    });

    it('calls generateId for new entry', async () => {
      mockLoadLog.mockResolvedValue([]);
      mockGenerateId.mockReturnValue('generated_id');

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addEntry({ gridType: '三分法', wasFavorite: false, suggestions: [] });
      });

      expect(mockGenerateId).toHaveBeenCalled();
    });

    it('calls addEntry service with new entry', async () => {
      mockLoadLog.mockResolvedValue([]);
      mockGenerateId.mockReturnValue('new_shoot_id');

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addEntry({ gridType: '三分法', wasFavorite: false, suggestions: [] });
      });

      expect(mockAddEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new_shoot_id',
          gridType: '三分法',
          wasFavorite: false,
        })
      );
    });

    it('updates computed values after adding entry', async () => {
      mockLoadLog.mockResolvedValue([createEntry({ id: 'existing_1', score: 70, wasFavorite: false })]);
      mockGenerateId.mockReturnValue('new_shoot_id');

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.addEntry({ gridType: '黄金分割', score: 90, wasFavorite: true, suggestions: [] });
      });

      expect(result.current.totalShoots).toBe(2);
      // avgScore: (70 + 90) / 1 = 80 (only 1 scored entry before, now 2)
      expect(result.current.avgScore).toBe(80);
      expect(result.current.favoriteCount).toBe(1);
    });
  });

  describe('clearLog', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('clears all entries', async () => {
      mockLoadLog.mockResolvedValue([
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.log).toHaveLength(2);

      await act(async () => {
        result.current.clearLog();
      });

      expect(result.current.log).toHaveLength(0);
    });

    it('calls clearLog service', async () => {
      mockLoadLog.mockResolvedValue([]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        result.current.clearLog();
      });

      expect(mockClearLog).toHaveBeenCalled();
    });

    it('resets computed values to 0', async () => {
      mockLoadLog.mockResolvedValue([
        createEntry({ id: 'shoot_1', score: 80, wasFavorite: true }),
        createEntry({ id: 'shoot_2', score: 90, wasFavorite: true }),
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.totalShoots).toBe(2);
      expect(result.current.avgScore).toBe(85);
      expect(result.current.favoriteCount).toBe(2);

      await act(async () => {
        result.current.clearLog();
      });

      expect(result.current.totalShoots).toBe(0);
      expect(result.current.avgScore).toBe(0);
      expect(result.current.favoriteCount).toBe(0);
    });
  });

  describe('deleteEntry', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('removes the specified entry from log', async () => {
      mockLoadLog.mockResolvedValue([
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
        createEntry({ id: 'shoot_3' }),
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.log).toHaveLength(3);

      await act(async () => {
        await result.current.deleteEntry('shoot_2');
      });

      expect(result.current.log).toHaveLength(2);
      expect(result.current.log.find((e) => e.id === 'shoot_2')).toBeUndefined();
      expect(result.current.log.find((e) => e.id === 'shoot_1')).toBeDefined();
      expect(result.current.log.find((e) => e.id === 'shoot_3')).toBeDefined();
    });

    it('calls deleteEntry service', async () => {
      mockLoadLog.mockResolvedValue([createEntry({ id: 'shoot_1' })]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteEntry('shoot_1');
      });

      expect(mockDeleteEntry).toHaveBeenCalledWith('shoot_1');
    });
  });

  describe('deleteEntries', () => {
    const createEntry = (overrides: Partial<ShootLogEntry> = {}): ShootLogEntry => ({
      id: 'shoot_1',
      date: '2026-04-10T10:00:00.000Z',
      gridType: '三分法',
      wasFavorite: false,
      suggestions: [],
      ...overrides,
    });

    it('removes multiple entries from log', async () => {
      mockLoadLog.mockResolvedValue([
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
        createEntry({ id: 'shoot_3' }),
        createEntry({ id: 'shoot_4' }),
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.log).toHaveLength(4);

      await act(async () => {
        await result.current.deleteEntries(['shoot_1', 'shoot_3']);
      });

      expect(result.current.log).toHaveLength(2);
      expect(result.current.log.find((e) => e.id === 'shoot_1')).toBeUndefined();
      expect(result.current.log.find((e) => e.id === 'shoot_3')).toBeUndefined();
      expect(result.current.log.find((e) => e.id === 'shoot_2')).toBeDefined();
      expect(result.current.log.find((e) => e.id === 'shoot_4')).toBeDefined();
    });

    it('calls deleteEntries service', async () => {
      mockLoadLog.mockResolvedValue([
        createEntry({ id: 'shoot_1' }),
        createEntry({ id: 'shoot_2' }),
      ]);

      const { result } = renderHook(() => useShootLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteEntries(['shoot_1', 'shoot_2']);
      });

      expect(mockDeleteEntries).toHaveBeenCalledWith(['shoot_1', 'shoot_2']);
    });
  });
});
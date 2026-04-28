/**
 * Unit tests for src/hooks/useFavorites.ts
 *
 * Tests the useFavorites hook which wraps the favorites service
 * with React state management and sorting.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useFavorites } from '../hooks/useFavorites';
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  generateFavoriteId,
} from '../services/favorites';

// Mock the entire favorites service
jest.mock('../services/favorites', () => ({
  loadFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  generateFavoriteId: jest.fn(),
}));

const mockLoadFavorites = loadFavorites as jest.MockedFunction<typeof loadFavorites>;
const mockAddFavorite = addFavorite as jest.MockedFunction<typeof addFavorite>;
const mockRemoveFavorite = removeFavorite as jest.MockedFunction<typeof removeFavorite>;
const mockGenerateFavoriteId = generateFavoriteId as jest.MockedFunction<typeof generateFavoriteId>;

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateFavoriteId.mockReturnValue('fav_12345_test');
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  it('initializes with empty favorites and loading=true', async () => {
    mockLoadFavorites.mockResolvedValue([]);

    const { result } = renderHook(() => useFavorites());

    // Before the async load resolves, loading is true
    expect(result.current.loading).toBe(true);
    expect(result.current.favorites).toEqual([]);
  });

  it('loads favorites on mount and sorts by score descending', async () => {
    const stored = [
      { id: 'a', uri: 'file:///a.jpg', score: 60, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
      { id: 'b', uri: 'file:///b.jpg', score: 90, date: '2026-01-02', gridType: 'golden', suggestion: '' },
      { id: 'c', uri: 'file:///c.jpg', score: 75, date: '2026-01-03', gridType: 'thirds', suggestion: '' },
    ];
    mockLoadFavorites.mockResolvedValue(stored);

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Sorted by score descending: b(90) > c(75) > a(60)
    expect(result.current.favorites).toHaveLength(3);
    expect(result.current.favorites[0].id).toBe('b');
    expect(result.current.favorites[1].id).toBe('c');
    expect(result.current.favorites[2].id).toBe('a');
  });

  it('sets loading=false after loadFavorites resolves (even on empty)', async () => {
    mockLoadFavorites.mockResolvedValue([]);

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('sets loading=false when loadFavorites rejects', async () => {
    mockLoadFavorites.mockRejectedValue(new Error('storage error'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // favorites remain empty on error
    expect(result.current.favorites).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // saveFavorite
  // -------------------------------------------------------------------------
  it('saveFavorite generates id, calls addFavorite with correct item, and updates state', async () => {
    mockLoadFavorites.mockResolvedValue([]);
    mockAddFavorite.mockResolvedValue([
      {
        id: 'fav_12345_test',
        uri: 'file:///new.jpg',
        score: 88,
        scoreReason: '构图良好',
        date: '2026-04-28T00:00:00.000Z',
        gridType: 'thirds',
        suggestion: '保持当前角度',
        sceneTag: '风光',
      },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let savedItem: ReturnType<typeof result.current.saveFavorite> extends Promise<infer T> ? T : never;

    await act(async () => {
      savedItem = await result.current.saveFavorite(
        'file:///new.jpg',
        'thirds',
        '保持当前角度',
        '风光',
        88,
        '构图良好'
      );
    });

    // Check generateFavoriteId was called
    expect(mockGenerateFavoriteId).toHaveBeenCalledTimes(1);

    // Check addFavorite was called with a properly structured item
    expect(mockAddFavorite).toHaveBeenCalledTimes(1);
    const addedItem = mockAddFavorite.mock.calls[0][0];
    expect(addedItem.id).toBe('fav_12345_test');
    expect(addedItem.uri).toBe('file:///new.jpg');
    expect(addedItem.gridType).toBe('thirds');
    expect(addedItem.suggestion).toBe('保持当前角度');
    expect(addedItem.sceneTag).toBe('风光');
    expect(addedItem.score).toBe(88);
    expect(addedItem.scoreReason).toBe('构图良好');

    // State was updated
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe('fav_12345_test');
  });

  it('saveFavorite defaults score to 85 when not provided', async () => {
    mockLoadFavorites.mockResolvedValue([]);
    mockAddFavorite.mockResolvedValue([
      {
        id: 'fav_12345_test',
        uri: 'file:///new.jpg',
        score: 85,
        date: '2026-04-28T00:00:00.000Z',
        gridType: 'golden',
        suggestion: '',
      },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFavorite('file:///new.jpg', 'golden');
    });

    const addedItem = mockAddFavorite.mock.calls[0][0];
    expect(addedItem.score).toBe(85);
  });

  it('saveFavorite sorts favorites by score descending after adding', async () => {
    // Existing favorites: score 70
    mockLoadFavorites.mockResolvedValue([
      { id: 'existing', uri: 'file:///existing.jpg', score: 70, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
    ]);
    // New item returns score 90
    mockAddFavorite.mockResolvedValue([
      { id: 'fav_12345_test', uri: 'file:///new.jpg', score: 90, date: '2026-04-28', gridType: 'thirds', suggestion: '' },
      { id: 'existing', uri: 'file:///existing.jpg', score: 70, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFavorite('file:///new.jpg', 'thirds', '', undefined, 90);
    });

    // New item (score 90) should be first
    expect(result.current.favorites[0].score).toBe(90);
    expect(result.current.favorites[1].score).toBe(70);
  });

  it('saveFavorite returns the created FavoriteItem', async () => {
    mockLoadFavorites.mockResolvedValue([]);
    mockAddFavorite.mockResolvedValue([
      {
        id: 'fav_12345_test',
        uri: 'file:///new.jpg',
        score: 80,
        date: '2026-04-28T00:00:00.000Z',
        gridType: 'diagonal',
        suggestion: '',
      },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedItem: Awaited<ReturnType<typeof result.current.saveFavorite>> | undefined;
    await act(async () => {
      returnedItem = await result.current.saveFavorite('file:///new.jpg', 'diagonal', '', undefined, 80);
    });

    expect(returnedItem).toBeDefined();
    expect(returnedItem!.id).toBe('fav_12345_test');
    expect(returnedItem!.uri).toBe('file:///new.jpg');
    expect(returnedItem!.score).toBe(80);
  });

  // -------------------------------------------------------------------------
  // deleteFavorite
  // -------------------------------------------------------------------------
  it('deleteFavorite calls removeFavorite with correct id and updates state', async () => {
    const stored = [
      { id: 'a', uri: 'file:///a.jpg', score: 80, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
      { id: 'b', uri: 'file:///b.jpg', score: 60, date: '2026-01-02', gridType: 'thirds', suggestion: '' },
    ];
    mockLoadFavorites.mockResolvedValue(stored);
    mockRemoveFavorite.mockResolvedValue([stored[1]]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.favorites).toHaveLength(2);

    await act(async () => {
      await result.current.deleteFavorite('a');
    });

    expect(mockRemoveFavorite).toHaveBeenCalledWith('a');
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe('b');
  });

  it('deleteFavorite updates state to empty array when last item is removed', async () => {
    mockLoadFavorites.mockResolvedValue([
      { id: 'only', uri: 'file:///only.jpg', score: 50, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
    ]);
    mockRemoveFavorite.mockResolvedValue([]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteFavorite('only');
    });

    expect(result.current.favorites).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------
  it('refresh reloads favorites and re-sorts', async () => {
    // Initial load
    mockLoadFavorites
      .mockResolvedValueOnce([
        { id: 'a', uri: 'file:///a.jpg', score: 50, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
      ])
      // Refresh call
      .mockResolvedValueOnce([
        { id: 'a', uri: 'file:///a.jpg', score: 50, date: '2026-01-01', gridType: 'thirds', suggestion: '' },
        { id: 'b', uri: 'file:///b.jpg', score: 90, date: '2026-01-02', gridType: 'thirds', suggestion: '' },
        { id: 'c', uri: 'file:///c.jpg', score: 70, date: '2026-01-03', gridType: 'thirds', suggestion: '' },
      ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favorites).toHaveLength(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockLoadFavorites).toHaveBeenCalledTimes(2);
    // Sorted descending: b(90) > c(70) > a(50)
    expect(result.current.favorites[0].id).toBe('b');
    expect(result.current.favorites[1].id).toBe('c');
    expect(result.current.favorites[2].id).toBe('a');
  });

  it('refresh sets loading=true while reloading', async () => {
    mockLoadFavorites
      .mockResolvedValueOnce([])
      // Simulate a slow second load
      .mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve([]), 50))
      );

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    // During refresh, loading should be true
    expect(result.current.loading).toBe(true);
  });
});

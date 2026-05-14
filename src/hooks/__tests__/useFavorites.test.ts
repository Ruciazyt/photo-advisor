/**
 * Unit tests for src/hooks/useFavorites.ts
 *
 * Mocks: services/favorites (loadFavorites, addFavorite, removeFavorite, generateFavoriteId)
 */

jest.mock('../../services/favorites', () => ({
  loadFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  generateFavoriteId: jest.fn(() => 'mock_fav_id_123'),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useFavorites } from '../useFavorites';
import { loadFavorites, addFavorite, removeFavorite } from '../../services/favorites';

const mockLoadFavorites = loadFavorites as jest.Mock;
const mockAddFavorite = addFavorite as jest.Mock;
const mockRemoveFavorite = removeFavorite as jest.Mock;

const sampleFavorites = [
  { id: 'f1', uri: 'file:///a.jpg', score: 80, scoreReason: 'good', date: '2024-01-01', gridType: 'thirds', suggestion: 'sug1', sceneTag: 'portrait' },
  { id: 'f2', uri: 'file:///b.jpg', score: 95, scoreReason: 'great', date: '2024-01-02', gridType: 'golden', suggestion: 'sug2', sceneTag: 'landscape' },
  { id: 'f3', uri: 'file:///c.jpg', score: 60, scoreReason: 'ok', date: '2024-01-03', gridType: 'diagonal', suggestion: 'sug3', sceneTag: 'food' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadFavorites.mockResolvedValue([]);
  mockAddFavorite.mockResolvedValue([]);
  mockRemoveFavorite.mockResolvedValue([]);
});

describe('initial state', () => {
  it('starts with empty favorites and loading=true', async () => {
    mockLoadFavorites.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 50)));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});

describe('loadFavorites integration', () => {
  it('loads favorites on mount and sorts by score descending', async () => {
    const unsorted = [
      { id: 'f1', uri: 'file:///a.jpg', score: 60, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'f2', uri: 'file:///b.jpg', score: 90, scoreReason: '', date: '2024-01-02', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'f3', uri: 'file:///c.jpg', score: 75, scoreReason: '', date: '2024-01-03', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ];
    mockLoadFavorites.mockResolvedValue(unsorted);

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.favorites).toHaveLength(3);
    expect(result.current.favorites[0].score).toBe(90);
    expect(result.current.favorites[1].score).toBe(75);
    expect(result.current.favorites[2].score).toBe(60);
  });

  it('sets loading=false even if loadFavorites rejects', async () => {
    mockLoadFavorites.mockRejectedValue(new Error('storage error'));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.favorites).toEqual([]);
  });
});

describe('saveFavorite', () => {
  it('calls addFavorite with a generated item', async () => {
    mockAddFavorite.mockResolvedValue([
      { id: 'mock_fav_id_123', uri: 'file:///new.jpg', score: 85, scoreReason: undefined, date: expect.any(String), gridType: 'thirds', suggestion: 'test suggestion', sceneTag: undefined },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFavorite('file:///new.jpg', 'thirds', 'test suggestion', undefined, 85, undefined);
    });

    expect(mockAddFavorite).toHaveBeenCalledTimes(1);
    const addedItem = mockAddFavorite.mock.calls[0][0];
    expect(addedItem.uri).toBe('file:///new.jpg');
    expect(addedItem.gridType).toBe('thirds');
    expect(addedItem.suggestion).toBe('test suggestion');
    expect(addedItem.score).toBe(85);
  });

  it('updates favorites state with new item sorted by score', async () => {
    mockAddFavorite.mockResolvedValue([
      { id: 'f1', uri: 'file:///a.jpg', score: 40, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'mock_fav_id_123', uri: 'file:///new.jpg', score: 90, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);
    mockLoadFavorites.mockResolvedValue([
      { id: 'f1', uri: 'file:///a.jpg', score: 40, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFavorite('file:///new.jpg', 'thirds', '', undefined, 90, '');
    });

    expect(result.current.favorites).toHaveLength(2);
    expect(result.current.favorites[0].score).toBe(90);
  });

  it('uses default score of 85 when not provided', async () => {
    mockAddFavorite.mockResolvedValue([
      { id: 'mock_fav_id_123', uri: 'file:///new.jpg', score: 85, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFavorite('file:///new.jpg', 'thirds', '', undefined);
    });

    const addedItem = mockAddFavorite.mock.calls[0][0];
    expect(addedItem.score).toBe(85);
  });

  it('returns the created FavoriteItem', async () => {
    mockAddFavorite.mockResolvedValue([]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedItem: any;
    await act(async () => {
      returnedItem = await result.current.saveFavorite('file:///new.jpg', 'thirds', 'sug');
    });

    expect(returnedItem.uri).toBe('file:///new.jpg');
    expect(returnedItem.id).toBe('mock_fav_id_123');
  });
});

describe('deleteFavorite', () => {
  it('calls removeFavorite with the given id', async () => {
    mockRemoveFavorite.mockResolvedValue([]);
    mockLoadFavorites.mockResolvedValue([
      { id: 'f1', uri: 'file:///a.jpg', score: 80, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteFavorite('f1');
    });

    expect(mockRemoveFavorite).toHaveBeenCalledWith('f1');
  });

  it('updates favorites state after deletion', async () => {
    mockRemoveFavorite.mockResolvedValue([
      { id: 'f2', uri: 'file:///b.jpg', score: 60, scoreReason: '', date: '2024-01-02', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);
    mockLoadFavorites.mockResolvedValue([
      { id: 'f1', uri: 'file:///a.jpg', score: 80, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
      { id: 'f2', uri: 'file:///b.jpg', score: 60, scoreReason: '', date: '2024-01-02', gridType: 'thirds', suggestion: '', sceneTag: '' },
    ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteFavorite('f1');
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe('f2');
  });
});

describe('refresh', () => {
  it('reloads favorites from storage', async () => {
    mockLoadFavorites
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'f1', uri: 'file:///a.jpg', score: 70, scoreReason: '', date: '2024-01-01', gridType: 'thirds', suggestion: '', sceneTag: '' },
      ]);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].id).toBe('f1');
  });
});

describe('sorting behavior', () => {
  it('always keeps favorites sorted by score descending', async () => {
    mockLoadFavorites.mockResolvedValue(sampleFavorites);

    const { result } = renderHook(() => useFavorites());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Already sorted by score descending: 95, 80, 60
    expect(result.current.favorites[0].score).toBe(95);
    expect(result.current.favorites[1].score).toBe(80);
    expect(result.current.favorites[2].score).toBe(60);

    // After deletion of top item, re-sort
    mockRemoveFavorite.mockResolvedValue(sampleFavorites.slice(1));
    await act(async () => {
      await result.current.deleteFavorite('f2');
    });

    expect(result.current.favorites[0].score).toBe(80);
    expect(result.current.favorites[1].score).toBe(60);
  });
});

describe('returned shape', () => {
  it('returns favorites, loading, saveFavorite, deleteFavorite, refresh', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current).toMatchObject({
      favorites: expect.any(Array),
      loading: expect.any(Boolean),
      saveFavorite: expect.any(Function),
      deleteFavorite: expect.any(Function),
      refresh: expect.any(Function),
    });
  });
});
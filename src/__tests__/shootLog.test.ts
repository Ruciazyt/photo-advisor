import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import {
  loadLog,
  addEntry,
  clearLog,
  generateId,
} from '../services/shootLog';
import type { ShootLogEntry } from '../services/shootLog';

const STORAGE_KEY = '@photo_advisor_shoot_log';

function makeEntry(overrides: Partial<ShootLogEntry> = {}): ShootLogEntry {
  return {
    id: generateId(),
    date: new Date().toISOString(),
    gridType: 'thirds',
    wasFavorite: false,
    suggestions: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('loadLog', () => {
  it('returns empty array when no data', async () => {
    const result = await loadLog();
    expect(result).toEqual([]);
  });

  it('returns parsed entries when data exists', async () => {
    const entry = makeEntry({ id: 'test_1' });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([entry]));
    const result = await loadLog();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test_1');
  });
});

describe('addEntry', () => {
  it('prepends entry and persists', async () => {
    const existing = makeEntry({ id: 'existing' });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([existing]));

    const newEntry = makeEntry({ id: 'new_entry', gridType: 'golden' });
    await addEntry(newEntry);

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(stored ?? '[]') as ShootLogEntry[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('new_entry');
    expect(parsed[1].id).toBe('existing');
  });
});

describe('clearLog', () => {
  it('removes all entries', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry()]));
    await clearLog();
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();
  });
});

describe('generateId', () => {
  it('generates unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^shoot_/);
  });
});

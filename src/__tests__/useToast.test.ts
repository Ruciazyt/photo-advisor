/**
 * Tests for useToast hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useToast } from '../hooks/useToast';

// Mock Reanimated v4
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns opacity shared value, toastMessage state, and showToast function', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.opacity).toBeDefined();
    expect(typeof result.current.toastMessage).toBe('string');
    expect(typeof result.current.showToast).toBe('function');
  });

  it('initial toastMessage is empty string', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toastMessage).toBe('');
  });

  it('showToast updates toastMessage', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toastMessage).toBe('Test message');
  });

  it('showToast can be called multiple times with different messages', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('First message');
    });
    expect(result.current.toastMessage).toBe('First message');

    act(() => {
      result.current.showToast('Second message');
    });
    expect(result.current.toastMessage).toBe('Second message');
  });

  it('returns opacity shared value that can be used with useAnimatedStyle', () => {
    const { result } = renderHook(() => useToast());
    // opacity should be a shared value object with .value property
    expect(result.current.opacity).toHaveProperty('value');
  });
});
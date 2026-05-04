/**
 * Camera2 Proxy — wraps native Camera2 module for RAW capture support.
 * This module is isolated so it can be easily mocked in tests.
 */

import { Platform } from 'react-native';

export interface RawCaptureResult {
  uri: string;
  path: string;
  width: number;
  height: number;
}

/** Check if the device supports RAW capture (Android only). */
export async function supportsRawCapture(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { NativeModules } = require('react-native');
    const module = NativeModules.Camera2RawModule;
    if (!module) return false;
    return await module.supportsRAW();
  } catch {
    return false;
  }
}

/** Attempt RAW capture; returns null on failure or if unsupported. */
export async function captureRawNative(): Promise<RawCaptureResult | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const { NativeModules } = require('react-native');
    const module = NativeModules.Camera2RawModule;
    if (!module) return null;
    return await module.captureRAW();
  } catch {
    return null;
  }
}
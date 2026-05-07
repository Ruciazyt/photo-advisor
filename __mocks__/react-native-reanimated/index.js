'use strict';

const React = require('react');
const { View, Text, Image, ScrollView } = require('react-native');

// Build a proper mock for animated components
function createAnimatedComponent(BaseComponent) {
  return React.forwardRef((props, ref) => React.createElement(BaseComponent, { ...props, ref }));
}

const Animated = {
  View: createAnimatedComponent(View),
  Text: createAnimatedComponent(Text),
  Image: createAnimatedComponent(Image),
  ScrollView: createAnimatedComponent(ScrollView),
  createAnimatedComponent,
};

const _sharedValues = new Map();
let _svId = 0;

function useSharedValue(initial) {
  const id = _svId++;
  if (!_sharedValues.has(id)) {
    _sharedValues.set(id, { value: initial });
  }
  return _sharedValues.get(id);
}

function cancelAnimation(sv) {
  // no-op in mock
}

function useAnimatedStyle(styleFn) {
  return styleFn();
}

function useAnimatedReaction(derive, react, deps) {
  // No-op in mock — just calls derive once to get initial state
  // and ignores further updates
  if (typeof derive === 'function') {
    derive();
  }
}

function withSpring(val, _opts) { return val; }
function withTiming(val, opts, callback) {
  // Defer callback via setTimeout(50) so findByText has a chance to find the element first.
  if (callback) setTimeout(() => { callback(true); }, 50);
  return val;
}
function withSequence(...vals) { return vals[vals.length - 1]; }
function withDelay(_, val) { try { if (typeof val === 'function') val(); } catch (_e) { /* ignore sync errors */ } return val; }
function withRepeat(val) { return val; }
function runOnJS(fn) { return fn; }

const Easing = {
  out: (e) => e,
  in: (e) => e,
  quad: (t) => t,
  ease: (t) => t,
};

// Shared state for useFrameCallback mock — persists across renders
let _frameCallback = null;
let _frameCallbackEnabled = false;
let _frameCount = 0;

function useFrameCallback(callback, enabled = true) {
  _frameCallback = callback;
  _frameCallbackEnabled = enabled;
}

function advanceAnimationByFrame(count = 1) {
  if (!_frameCallback || !_frameCallbackEnabled) return;
  for (let i = 0; i < count; i++) {
    _frameCount++;
    _frameCallback({ timeSincePreviousFrame: 16 }); // simulate ~60fps delta
  }
}

function advanceAnimationByTime(ms) {
  if (!_frameCallback || !_frameCallbackEnabled) return;
  // Simulate enough frames to cover the time (assume 16ms per frame)
  const frames = Math.ceil(ms / 16);
  for (let i = 0; i < frames; i++) {
    _frameCount++;
    _frameCallback({ timeSincePreviousFrame: 16 });
  }
}

module.exports = {
  default: Animated.View,
  AnimatedView: Animated.View,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  withSequence,
  cancelAnimation,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  useFrameCallback,
  advanceAnimationByFrame,
  advanceAnimationByTime,
  useAnimatedProps: () => ({}),
  useDerivedValue: (fn) => ({ value: fn() }),
  interpolate: () => 0,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  createAnimatedComponent,
  setUpTests: () => {},
  withReanimatedTimer: () => {},
  reanimatedVersion: '4.0.0',
  ReduceMotion: { Never: 'never', Always: 'always', GetSetting: 'getSetting' },
  SensorType: {},
  KeyboardState: {},
  ColorSpace: {},
  InterfaceOrientation: {},
  IOSReferenceFrame: {},
};

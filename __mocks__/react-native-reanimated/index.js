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

function withSpring(val, _opts) { return val; }
function withTiming(val, _opts) { return val; }
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

module.exports = {
  default: Animated.View,
  AnimatedView: Animated.View,
  ...Animated,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  cancelAnimation,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
  useAnimatedProps: () => ({}),
  useDerivedValue: (fn) => ({ value: fn() }),
  interpolate: () => 0,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  createAnimatedComponent,
  setUpTests: () => {},
  advanceAnimationByFrame: () => {},
  advanceAnimationByTime: () => {},
  withReanimatedTimer: () => {},
  reanimatedVersion: '4.0.0',
  ReduceMotion: { Never: 'never', Always: 'always', GetSetting: 'getSetting' },
  SensorType: {},
  KeyboardState: {},
  ColorSpace: {},
  InterfaceOrientation: {},
  IOSReferenceFrame: {},
};

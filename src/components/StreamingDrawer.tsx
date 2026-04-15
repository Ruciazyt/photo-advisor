import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence, withDelay, Easing, runOnJS } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.6;

interface StreamingDrawerProps {
  visible: boolean;
  text: string;
  loading: boolean;
  onClose: () => void;
}

export function StreamingDrawer({ visible, text, loading, onClose }: StreamingDrawerProps) {
  const { colors } = useTheme();
  const [isClosed, setIsClosed] = React.useState(true);
  const translateY = useSharedValue(DRAWER_HEIGHT);
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsClosed(false);
      translateY.value = withSpring(0, { tension: 65, friction: 11 });
    } else {
      translateY.value = withTiming(DRAWER_HEIGHT, {
        duration: 250,
        easing: Easing.out(Easing.ease),
      }, (finished) => {
        if (finished) runOnJS(setIsClosed)(true);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!loading) {
      dot1.value = 0;
      dot2.value = 0;
      dot3.value = 0;
      return;
    }
    const bounce = (dot: Animated.SharedValue<number>, delay: number) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(delay, withTiming(-8, { duration: 300, easing: Easing.out(Easing.quad) })),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1, // infinite
        false
      );
    };
    bounce(dot1, 0);
    bounce(dot2, 150);
    bounce(dot3, 300);
    return () => {
      dot1.value = 0;
      dot2.value = 0;
      dot3.value = 0;
    };
  }, [loading]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const dot1Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const dot2Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const dot3Style = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  if (isClosed) return null;

  return (
    <View style={[styles.overlay, !visible && styles.overlayHidden]}>
      <TouchableOpacity style={styles.overlayTouch} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.drawer, drawerStyle]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 分析结果</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {text ? <Text style={styles.text}>{text}</Text> : null}
          {loading && (
            <View style={styles.dotsContainer}>
              <Animated.Text style={[styles.dot, dot1Style]}>●</Animated.Text>
              <Animated.Text style={[styles.dot, dot2Style]}>●</Animated.Text>
              <Animated.Text style={[styles.dot, dot3Style]}>●</Animated.Text>
            </View>
          )}
          {!text && !loading && <Text style={styles.placeholder}>点击发送按钮开始分析</Text>}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  overlayHidden: { opacity: 0, pointerEvents: 'none' },
  overlayTouch: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: {
    height: DRAWER_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: '#666', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { color: '#e8d5b7', fontSize: 16, fontWeight: '600' },
  closeBtn: { color: '#999', fontSize: 20 },
  content: { flex: 1, marginTop: 12 },
  contentContainer: { paddingBottom: 20 },
  text: { color: '#fff', fontSize: 15, lineHeight: 24 },
  dotsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },
  dot: { fontSize: 20, color: '#e8d5b7' },
  placeholder: { color: '#999', fontSize: 14, textAlign: 'center', paddingTop: 40 },
});

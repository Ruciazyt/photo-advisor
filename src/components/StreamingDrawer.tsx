import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { Colors } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.6;

interface StreamingDrawerProps {
  visible: boolean;
  text: string;
  loading: boolean;
  onClose: () => void;
}

export function StreamingDrawer({ visible, text, loading, onClose }: StreamingDrawerProps) {
  const slideAnim = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: DRAWER_HEIGHT,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!loading) {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
      return;
    }

    const bounce = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -8,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
        ]),
      ).start();
    };

    bounce(dot1, 0);
    bounce(dot2, 150);
    bounce(dot3, 300);

    return () => {
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [loading]);

  if (!visible && slideAnim._value === DRAWER_HEIGHT) return null;

  return (
    <View style={[styles.overlay, !visible && styles.overlayHidden]}>
      <TouchableOpacity
        style={styles.overlayTouch}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 分析结果</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {text ? (
            <Text style={styles.text}>{text}</Text>
          ) : null}
          {loading && (
            <View style={styles.dotsContainer}>
              <Animated.Text style={[styles.dot, { transform: [{ translateY: dot1 }] }]}>●</Animated.Text>
              <Animated.Text style={[styles.dot, { transform: [{ translateY: dot2 }] }]}>●</Animated.Text>
              <Animated.Text style={[styles.dot, { transform: [{ translateY: dot3 }] }]}>●</Animated.Text>
            </View>
          )}
          {!text && !loading && (
            <Text style={styles.placeholder}>点击发送按钮开始分析</Text>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlayHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    height: DRAWER_HEIGHT,
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    color: Colors.textSecondary,
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  text: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  dot: {
    fontSize: 20,
    color: Colors.accent,
  },
  placeholder: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 40,
  },
});

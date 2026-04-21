import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibilityAnnouncement } from '../hooks/useAccessibility';
import type { CompositionGrade, CompositionScoreResult, ChallengeSession, CompositionScoreOverlayProps } from '../types';
export type { CompositionScoreOverlayProps };

// ---- 60fps animation constants ----
// All durations are even multiples of ~16.67ms (60fps frame time).
const OVERLAY_FADE_IN_MS = 200;
const GRADE_DELAY_MS = 1500;        // delay before grade pops in
const GRADE_SCALE_MS = 400;          // grade spring animation duration
const OVERLAY_AUTO_DISMISS_MS = 4000; // overlay visible total time
const OVERLAY_FADE_OUT_MS = 300;
const SPARKLE_DURATION_MS = 600;     // 36 frames — snappier sparkle trail

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GRADE_LABELS: Record<CompositionGrade, string> = {
  S: '★★★★★',
  A: '★★★★',
  B: '★★★',
  C: '★★',
  D: '★',
};

// Module-level static styles (no theme dependency)
const staticStyles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

function gradeFromScore(score: number): CompositionGrade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

// ---- Sparkle View: owns its own shared values, animates via useAnimatedStyle ----

interface SparkleItem {
  id: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  color: string;
}

function SparkleView({ originX, originY, targetX, targetY, color }: Omit<SparkleItem, 'id'>) {
  const x = useSharedValue(originX);
  const y = useSharedValue(originY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Animate all properties on mount — all UI thread
  x.value = withTiming(targetX, { duration: SPARKLE_DURATION_MS, easing: Easing.out(Easing.ease) });
  y.value = withTiming(targetY, { duration: SPARKLE_DURATION_MS, easing: Easing.out(Easing.ease) });
  scale.value = withTiming(1, { duration: SPARKLE_DURATION_MS, easing: Easing.out(Easing.ease) });
  opacity.value = withTiming(0, { duration: SPARKLE_DURATION_MS, easing: Easing.out(Easing.ease) });
  rotation.value = withTiming(1, { duration: SPARKLE_DURATION_MS, easing: Easing.linear });

  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value * 360}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[staticStyles.sparkle, { backgroundColor: color }, animatedStyle]}
    />
  );
}

export function CompositionScoreOverlay({
  result,
  challengeMode,
  session,
  onDismiss,
}: CompositionScoreOverlayProps) {
  const { colors } = useTheme();
  const { score, breakdown, grade } = result;
  const { announce } = useAccessibilityAnnouncement();

  const [displayScore, setDisplayScore] = useState(0);
  const [showGrade, setShowGrade] = useState(false);

  // UI-thread animation shared values
  const overlayOpacity = useSharedValue(0);
  const gradePopScale = useSharedValue(0);

  const announcedRef = useRef(false);

  // Sparkle origin/target data (passed as plain props, each SparkleView creates its own SVs)
  const [sparkleItems, setSparkleItems] = useState<SparkleItem[]>([]);

  const isHighRank = grade === 'S' || grade === 'A';

  // Theme-aware grade color
  const gradeColor = useMemo(() => {
    switch (grade) {
      case 'S': return colors.scoreS;
      case 'A': return colors.scoreA;
      case 'B': return colors.scoreB;
      case 'C': return colors.scoreC;
      case 'D': return colors.scoreD;
    }
  }, [grade, colors.scoreS, colors.scoreA, colors.scoreB, colors.scoreC, colors.scoreD]);

  // Build theme-aware dynamic styles
  const s = useMemo(() => {
    const c = colors;
    return StyleSheet.create({
      overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.scoreOverlayBg,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
      },
      hintContainer: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
      },
      hintText: {
        color: c.scoreHintText,
        fontSize: 12,
      },
      card: {
        backgroundColor: c.scoreCardBg,
        borderRadius: 20,
        padding: 24,
        width: SCREEN_WIDTH * 0.8,
        maxWidth: 340,
        borderWidth: 1,
        borderColor: c.scoreCardBorder,
        alignItems: 'center',
      },
      scoreRow: {
        alignItems: 'center',
        marginBottom: 16,
      },
      scoreLabel: {
        color: c.scoreLabelText,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
      },
      scoreValue: {
        fontSize: 72,
        fontWeight: '900',
        lineHeight: 80,
      },
      gradeBadge: {
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 8,
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'center',
      },
      gradeText: {
        color: c.primary === '#000000' ? '#000000' : '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
      },
      gradeStars: {
        color: c.primary === '#000000' ? '#000000' : '#FFFFFF',
        fontSize: 12,
        marginTop: 2,
      },
      breakdownContainer: {
        width: '100%',
        gap: 8,
      },
      breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      breakdownLabel: {
        color: c.text + 'B3', // 70% opacity
        fontSize: 12,
        width: 64,
      },
      barContainer: {
        flex: 1,
        height: 6,
        backgroundColor: c.scoreBarBg,
        borderRadius: 3,
        overflow: 'hidden',
      },
      breakdownValue: {
        fontSize: 12,
        fontWeight: '700',
        width: 28,
        textAlign: 'right',
      },
      sessionContainer: {
        marginTop: 16,
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: c.scoreCardBorder,
        paddingTop: 12,
      },
      sessionTitle: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 8,
      },
      sessionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
      },
      sessionLabel: {
        color: c.scoreLabelText,
        fontSize: 12,
      },
      sessionValue: {
        fontSize: 14,
        fontWeight: '700',
      },
    });
  }, [colors]);

  // ---- Reset + set up all animations on component mount ----
  useEffect(() => {
    // Reset
    setDisplayScore(0);
    setShowGrade(false);
    announcedRef.current = false;
    overlayOpacity.value = 0;
    gradePopScale.value = 0;

    if (isHighRank) {
      const sparkleColors = [colors.scoreS, colors.scoreA, '#FF69B4', '#87CEEB', '#98FB98'];
      const angle = (i: number) => (i / 6) * Math.PI * 2;
      const newItems: SparkleItem[] = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        originX: SCREEN_WIDTH / 2,
        originY: 200,
        targetX: SCREEN_WIDTH / 2 + Math.cos(angle(i)) * 120,
        targetY: 200 + Math.sin(angle(i)) * 80,
        color: sparkleColors[i % sparkleColors.length],
      }));
      setSparkleItems(newItems);
    } else {
      setSparkleItems([]);
    }

    // Fade in overlay (pure UI-thread animation)
    overlayOpacity.value = withTiming(1, { duration: OVERLAY_FADE_IN_MS, easing: Easing.linear });

    // Grade badge pop + score display: both triggered at GRADE_DELAY_MS via withDelay.
    // The grade badge uses withSpring for bounce; score reveal uses withDelay + useAnimatedReaction.
    gradePopScale.value = withDelay(
      GRADE_DELAY_MS,
      withSpring(1, { stiffness: 120, damping: 8 }),
    );

    // Auto-dismiss: fade out on UI thread after total visible duration
    overlayOpacity.value = withDelay(
      OVERLAY_AUTO_DISMISS_MS,
      withTiming(0, { duration: OVERLAY_FADE_OUT_MS, easing: Easing.linear }),
    );
  }, [score, grade, isHighRank, colors.scoreS, colors.scoreA]);

  // ---- Trigger grade + score display + announcement when GRADE_DELAY_MS has elapsed ----
  // Uses useAnimatedReaction to detect gradePopScale crossing 0→non-zero
  // on the UI thread, then jumps to JS for setState + a11y announcement.
  // All driven by withDelay on UI thread — no JS setTimeout/setInterval.
  useAnimatedReaction(
    () => gradePopScale.value > 0 && !showGrade,
    (isVisible, previousIsVisible) => {
      if (isVisible && !previousIsVisible) {
        runOnJS(setShowGrade)(true);
        runOnJS(setDisplayScore)(score);
        if (!announcedRef.current) {
          runOnJS(announce)('构图评分 ' + score + '分，等级' + grade, 'assertive');
          announcedRef.current = true;
        }
      }
    },
    [score, grade, announce],
  );

  // ---- Trigger onDismiss when overlay fully fades out ----
  // Monitors overlayOpacity on UI thread; calls onDismiss via runOnJS when it reaches 0.
  useAnimatedReaction(
    () => overlayOpacity.value,
    (opacity) => {
      if (opacity === 0) {
        runOnJS(onDismiss)();
      }
    },
    [],
  );

  // Tap to dismiss: cancel auto-dismiss timer by resetting overlayOpacity
  const handleTap = () => {
    overlayOpacity.value = withTiming(0, { duration: 200, easing: Easing.linear });
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const gradeAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: gradePopScale.value }] }));

  return (
    <Animated.View style={[s.overlay, overlayAnimatedStyle]} pointerEvents="box-none">
      {/* Sparkles for S/A rank */}
      {isHighRank && sparkleItems.map(sp => (
        <SparkleView
          key={sp.id}
          originX={sp.originX}
          originY={sp.originY}
          targetX={sp.targetX}
          targetY={sp.targetY}
          color={sp.color}
        />
      ))}

      {/* Tap to dismiss hint */}
      <View style={s.hintContainer}>
        <Text style={s.hintText}>轻触关闭</Text>
      </View>

      {/* Main card */}
      <Animated.View style={s.card} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={handleTap}>
          <View>
            {/* Score */}
            <View style={s.scoreRow}>
              <Text style={s.scoreLabel}>构图评分</Text>
              <Text style={[s.scoreValue, { color: gradeColor }]}>{displayScore}</Text>
            </View>

            {/* Grade badge */}
            {showGrade && (
              <Animated.View
                style={[
                  s.gradeBadge,
                  { backgroundColor: gradeColor },
                  gradeAnimatedStyle,
                ]}
              >
                <Text style={s.gradeText}>{grade}</Text>
                <Text style={s.gradeStars}>{GRADE_LABELS[grade]}</Text>
              </Animated.View>
            )}

            {/* Breakdown */}
            <View style={s.breakdownContainer}>
              <BreakdownRow label="构图对齐" value={breakdown.alignment} accentColor={colors.accent} s={s} />
              <BreakdownRow label="左右平衡" value={breakdown.balance} accentColor={colors.accent} s={s} />
              <BreakdownRow label="中心位置" value={breakdown.centrality} accentColor={colors.accent} s={s} />
            </View>

            {/* Challenge session stats */}
            {challengeMode && session.count > 0 && (
              <View style={s.sessionContainer}>
                <Text style={[s.sessionTitle, { color: colors.warning }]}>🎮 挑战模式</Text>
                <View style={s.sessionRow}>
                  <Text style={s.sessionLabel}>本轮最高</Text>
                  <Text style={[s.sessionValue, {
                    color: (() => {
                      switch (gradeFromScore(session.bestScore)) {
                        case 'S': return colors.scoreS;
                        case 'A': return colors.scoreA;
                        case 'B': return colors.scoreB;
                        case 'C': return colors.scoreC;
                        case 'D': return colors.scoreD;
                      }
                    })(),
                  }]}>
                    {session.bestScore}
                  </Text>
                </View>
                <View style={s.sessionRow}>
                  <Text style={s.sessionLabel}>累计平均</Text>
                  <Text style={[s.sessionValue, { color: colors.accent }]}>
                    {session.count > 0 ? Math.round(session.cumulative / session.count) : 0}
                  </Text>
                </View>
                <View style={s.sessionRow}>
                  <Text style={s.sessionLabel}>已拍张数</Text>
                  <Text style={[s.sessionValue, { color: colors.accent }]}>{session.count}</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Animated.View>
  );
}

function BreakdownRow({ label, value, accentColor, s }: { label: string; value: number; accentColor: string; s: ReturnType<typeof StyleSheet.create> }) {
  const barWidth = (value / 100) * 100;
  return (
    <View style={s.breakdownRow}>
      <Text style={s.breakdownLabel}>{label}</Text>
      <View style={s.barContainer}>
        <View style={{ height: '100%', width: `${barWidth}%`, backgroundColor: accentColor, borderRadius: 3 }} />
      </View>
      <Text style={[s.breakdownValue, { color: accentColor }]}>{value}</Text>
    </View>
  );
}

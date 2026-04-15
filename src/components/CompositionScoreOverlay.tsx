import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GRADE_COLORS: Record<CompositionGrade, string> = {
  S: '#FFD700', // gold
  A: '#C0C0C0', // silver
  B: '#CD7F32', // bronze
  C: '#8B7355', // muted brown
  D: '#555555', // dark gray
};

const GRADE_LABELS: Record<CompositionGrade, string> = {
  S: '★★★★★',
  A: '★★★★',
  B: '★★★',
  C: '★★',
  D: '★',
};

// Module-level static styles
const overlayStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  card: {
    backgroundColor: 'rgba(28,28,28,0.95)',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  scoreRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.6)',
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
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
  },
  gradeStars: {
    color: '#000',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    width: 64,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    borderTopColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
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
  x.value = withTiming(targetX, { duration: 800, easing: Easing.out(Easing.ease) });
  y.value = withTiming(targetY, { duration: 800, easing: Easing.out(Easing.ease) });
  scale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
  opacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) });
  rotation.value = withTiming(1, { duration: 800, easing: Easing.linear });

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
      style={[overlayStyles.sparkle, { backgroundColor: color }, animatedStyle]}
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
  const gradeColor = GRADE_COLORS[grade];

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset
    setDisplayScore(0);
    setShowGrade(false);
    overlayOpacity.value = 0;
    gradePopScale.value = 0;

    if (isHighRank) {
      const sparkleColors = ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98'];
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

    // Fade in overlay
    overlayOpacity.value = withTiming(1, { duration: 200, easing: Easing.linear });

    // Count-up displayScore via UI thread + runOnJS
    withDelay(1550, runOnJS(setDisplayScore)(score));

    // After count-up, show grade
    const gradeTimer = setTimeout(() => {
      setShowGrade(true);
      if (!announcedRef.current) {
        announce('构图评分 ' + score + '分，等级' + grade, 'assertive');
        announcedRef.current = true;
      }
      gradePopScale.value = withSpring(1, { stiffness: 120, damping: 8 });

      dismissTimerRef.current = setTimeout(() => {
        overlayOpacity.value = withTiming(0, { duration: 300, easing: Easing.linear }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
      }, 2500);
    }, 1500);

    return () => {
      clearTimeout(gradeTimer);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [score, grade]);

  const handleTap = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    overlayOpacity.value = withTiming(0, { duration: 200, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const gradeAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: gradePopScale.value }] }));

  return (
    <Animated.View style={[overlayStyles.overlay, overlayAnimatedStyle]} pointerEvents="box-none">
      {/* Sparkles for S/A rank */}
      {isHighRank && sparkleItems.map(s => (
        <SparkleView
          key={s.id}
          originX={s.originX}
          originY={s.originY}
          targetX={s.targetX}
          targetY={s.targetY}
          color={s.color}
        />
      ))}

      {/* Tap to dismiss hint */}
      <View style={overlayStyles.hintContainer}>
        <Text style={overlayStyles.hintText}>轻触关闭</Text>
      </View>

      {/* Main card */}
      <Animated.View style={overlayStyles.card} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={handleTap}>
          <View>
            {/* Score */}
            <View style={overlayStyles.scoreRow}>
              <Text style={overlayStyles.scoreLabel}>构图评分</Text>
              <Text style={[overlayStyles.scoreValue, { color: gradeColor }]}>{displayScore}</Text>
            </View>

            {/* Grade badge */}
            {showGrade && (
              <Animated.View
                style={[
                  overlayStyles.gradeBadge,
                  { backgroundColor: gradeColor },
                  gradeAnimatedStyle,
                ]}
              >
                <Text style={overlayStyles.gradeText}>{grade}</Text>
                <Text style={overlayStyles.gradeStars}>{GRADE_LABELS[grade]}</Text>
              </Animated.View>
            )}

            {/* Breakdown */}
            <View style={overlayStyles.breakdownContainer}>
              <BreakdownRow label="构图对齐" value={breakdown.alignment} accentColor={colors.accent} />
              <BreakdownRow label="左右平衡" value={breakdown.balance} accentColor={colors.accent} />
              <BreakdownRow label="中心位置" value={breakdown.centrality} accentColor={colors.accent} />
            </View>

            {/* Challenge session stats */}
            {challengeMode && session.count > 0 && (
              <View style={overlayStyles.sessionContainer}>
                <Text style={[overlayStyles.sessionTitle, { color: colors.warning }]}>🎮 挑战模式</Text>
                <View style={overlayStyles.sessionRow}>
                  <Text style={overlayStyles.sessionLabel}>本轮最高</Text>
                  <Text style={[overlayStyles.sessionValue, { color: GRADE_COLORS[gradeFromScore(session.bestScore)]}]}>
                    {session.bestScore}
                  </Text>
                </View>
                <View style={overlayStyles.sessionRow}>
                  <Text style={overlayStyles.sessionLabel}>累计平均</Text>
                  <Text style={[overlayStyles.sessionValue, { color: colors.accent }]}>
                    {session.count > 0 ? Math.round(session.cumulative / session.count) : 0}
                  </Text>
                </View>
                <View style={overlayStyles.sessionRow}>
                  <Text style={overlayStyles.sessionLabel}>已拍张数</Text>
                  <Text style={[overlayStyles.sessionValue, { color: colors.accent }]}>{session.count}</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Animated.View>
  );
}

function BreakdownRow({ label, value, accentColor }: { label: string; value: number; accentColor: string }) {
  const barWidth = (value / 100) * 100;
  return (
    <View style={overlayStyles.breakdownRow}>
      <Text style={overlayStyles.breakdownLabel}>{label}</Text>
      <View style={overlayStyles.barContainer}>
        <View style={{ height: '100%', width: `${barWidth}%`, backgroundColor: accentColor, borderRadius: 3 }} />
      </View>
      <Text style={[overlayStyles.breakdownValue, { color: accentColor }]}>{value}</Text>
    </View>
  );
}

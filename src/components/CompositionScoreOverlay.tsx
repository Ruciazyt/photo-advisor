import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { CompositionGrade, CompositionScoreResult, ChallengeSession, CompositionScoreOverlayProps, SparkleItem } from '../types';
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

export function CompositionScoreOverlay({
  result,
  challengeMode,
  session,
  onDismiss,
}: CompositionScoreOverlayProps) {
  const { colors } = useTheme();
  const { score, breakdown, grade } = result;

  const [displayScore, setDisplayScore] = useState(0);
  const [showGrade, setShowGrade] = useState(false);

  const countAnim = useRef(new Animated.Value(0)).current;
  const gradePopAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Sparkle animations for S/A rank
  const [sparkles, setSparkles] = useState<SparkleItem[]>([]);
  const sparkleAnims = useRef<Animated.CompositeAnimation[]>([]);

  const isHighRank = grade === 'S' || grade === 'A';
  const gradeColor = GRADE_COLORS[grade];

  // Dismiss timer
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = StyleSheet.create({
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
    barFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    breakdownValue: {
      color: colors.accent,
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
      color: colors.warning,
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
      color: colors.accent,
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

  useEffect(() => {
    // Reset state
    setDisplayScore(0);
    setShowGrade(false);
    countAnim.setValue(0);
    gradePopAnim.setValue(0);
    overlayOpacity.setValue(0);

    if (isHighRank) {
      // Initialize sparkles
      const sparkleColors = ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98'];
      const newSparkles: SparkleItem[] = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: new Animated.Value(SCREEN_WIDTH / 2),
        y: new Animated.Value(200),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(0),
        color: sparkleColors[i % sparkleColors.length],
        rotation: new Animated.Value(0),
      }));
      setSparkles(newSparkles);

      // Animate sparkles outward
      const angle = (i: number) => (i / 6) * Math.PI * 2;
      sparkleAnims.current = newSparkles.map((s, i) => {
        const targetX = SCREEN_WIDTH / 2 + Math.cos(angle(i)) * 120;
        const targetY = 200 + Math.sin(angle(i)) * 80;
        return Animated.parallel([
          Animated.timing(s.x, { toValue: targetX, duration: 800, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: targetY, duration: 800, useNativeDriver: true }),
          Animated.timing(s.scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(s.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
          Animated.timing(s.rotation, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]);
      });

      Animated.parallel(sparkleAnims.current).start();
    }

    // Fade in overlay
    Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    // Count up animation (1.5s)
    Animated.timing(countAnim, {
      toValue: score,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Listen to countAnim for display score
    const listener = countAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    // After count-up, show grade
    const gradeTimer = setTimeout(() => {
      setShowGrade(true);
      Animated.spring(gradePopAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Auto dismiss after 2.5s more
      dismissTimerRef.current = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, 2500);
    }, 1500);

    return () => {
      clearTimeout(gradeTimer);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      countAnim.removeListener(listener);
      sparkleAnims.current.forEach(a => a.stop());
    };
  }, [score, grade]);

  const handleTap = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">
      {/* Sparkles for S/A rank */}
      {isHighRank && sparkles.map(s => (
        <Animated.View
          key={s.id}
          style={[
            styles.sparkle,
            {
              left: s.x,
              top: s.y,
              backgroundColor: s.color,
              opacity: s.opacity,
              transform: [
                { scale: s.scale },
                {
                  rotate: s.rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Tap to dismiss hint */}
      <Animated.View style={styles.hintContainer}>
        <Text style={styles.hintText}>轻触关闭</Text>
      </Animated.View>

      {/* Main card */}
      <Animated.View style={styles.card} pointerEvents="box-none">
        <TouchableWithoutFeedback onPress={handleTap}>
          <View>
            {/* Score */}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>构图评分</Text>
              <Text style={[styles.scoreValue, { color: gradeColor }]}>{displayScore}</Text>
            </View>

            {/* Grade badge */}
            {showGrade && (
              <Animated.View
                style={[
                  styles.gradeBadge,
                  {
                    backgroundColor: gradeColor,
                    transform: [{ scale: gradePopAnim }],
                  },
                ]}
              >
                <Text style={styles.gradeText}>{grade}</Text>
                <Text style={styles.gradeStars}>{GRADE_LABELS[grade]}</Text>
              </Animated.View>
            )}

            {/* Breakdown */}
            <View style={styles.breakdownContainer}>
              <BreakdownRow label="构图对齐" value={breakdown.alignment} styles={styles} />
              <BreakdownRow label="左右平衡" value={breakdown.balance} styles={styles} />
              <BreakdownRow label="中心位置" value={breakdown.centrality} styles={styles} />
            </View>

            {/* Challenge session stats */}
            {challengeMode && session.count > 0 && (
              <View style={styles.sessionContainer}>
                <Text style={styles.sessionTitle}>🎮 挑战模式</Text>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>本轮最高</Text>
                  <Text style={[styles.sessionValue, { color: GRADE_COLORS[gradeFromScore(session.bestScore)]}]}>
                    {session.bestScore}
                  </Text>
                </View>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>累计平均</Text>
                  <Text style={styles.sessionValue}>
                    {session.count > 0 ? Math.round(session.cumulative / session.count) : 0}
                  </Text>
                </View>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>已拍张数</Text>
                  <Text style={styles.sessionValue}>{session.count}</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Animated.View>
  );
}

function BreakdownRow({ label, value, styles }: { label: string; value: number; styles: ReturnType<typeof StyleSheet.create> }) {
  const barWidth = (value / 100) * 100;
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${barWidth}%` }]} />
      </View>
      <Text style={styles.breakdownValue}>{value}</Text>
    </View>
  );
}

function gradeFromScore(score: number): CompositionGrade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

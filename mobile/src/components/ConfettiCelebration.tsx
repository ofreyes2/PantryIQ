import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Trophy } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  Colors.green,
  Colors.amber,
  Colors.error,
  '#3498DB',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
];

interface ConfettiParticleProps {
  index: number;
  startX: number;
  color: string;
  delay: number;
}

function ConfettiParticle({ index, startX, color, delay }: ConfettiParticleProps) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const driftX = (Math.random() - 0.5) * 80;
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 40, { duration: 3000, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(driftX, { duration: 3000, easing: Easing.inOut(Easing.sin) })
    );
    rotation.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), 4, false)
    );
    opacity.value = withDelay(
      delay + 2200,
      withTiming(0, { duration: 800 })
    );
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        { left: startX, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
  message: string;
  subMessage?: string;
}

export function ConfettiCelebration({
  visible,
  onDismiss,
  message,
  subMessage,
}: ConfettiCelebrationProps) {
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      cardScale.value = withSequence(
        withTiming(1.05, { duration: 300, easing: Easing.out(Easing.back(2)) }),
        withTiming(1.0, { duration: 150 })
      );
      cardOpacity.value = withTiming(1, { duration: 300 });
    } else {
      cardScale.value = withTiming(0.8, { duration: 200 });
      cardOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const particles = Array.from({ length: 40 }, (_, i) => ({
    index: i,
    startX: Math.random() * SCREEN_WIDTH,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? Colors.green,
    delay: i * 50,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      testID="confetti-celebration-modal"
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        {/* Confetti particles */}
        {particles.map((p) => (
          <ConfettiParticle
            key={p.index}
            index={p.index}
            startX={p.startX}
            color={p.color}
            delay={p.delay}
          />
        ))}

        {/* Achievement card */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.trophyContainer}>
              <Trophy size={48} color={Colors.amber} />
            </View>
            <Text style={styles.messageText}>{message}</Text>
            {subMessage ? (
              <Text style={styles.subMessageText}>{subMessage}</Text>
            ) : null}
            <Pressable
              style={styles.dismissButton}
              onPress={onDismiss}
              testID="confetti-dismiss-button"
            >
              <Text style={styles.dismissText}>Awesome!</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiParticle: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 16,
    borderRadius: 2,
  },
  card: {
    backgroundColor: '#0F2040',
    borderRadius: BorderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    width: SCREEN_WIDTH - 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  trophyContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(243,156,18,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  messageText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  subMessageText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  dismissButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  dismissText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

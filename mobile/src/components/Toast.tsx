import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { CheckCircle2, XCircle, Info } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
}

export function Toast({ message, type, visible, onHide }: ToastProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        translateY.value = withTiming(100, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) {
            runOnJS(onHide)();
          }
        });
      }, 2500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, message]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const bgColor =
    type === 'success'
      ? 'rgba(46,204,113,0.15)'
      : type === 'error'
      ? 'rgba(231,76,60,0.15)'
      : Colors.surface;

  const borderColor =
    type === 'success'
      ? Colors.green
      : type === 'error'
      ? Colors.error
      : Colors.border;

  const iconColor =
    type === 'success' ? Colors.green : type === 'error' ? Colors.error : Colors.textSecondary;

  const Icon =
    type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : Info;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor },
        animStyle,
      ]}
      testID="toast-notification"
    >
      <Icon size={18} color={iconColor} />
      <Text style={[styles.message, { color: iconColor }]}>{message}</Text>
    </Animated.View>
  );
}

// ─── useToast Hook ─────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type, visible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return { toast, showToast, hideToast };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});

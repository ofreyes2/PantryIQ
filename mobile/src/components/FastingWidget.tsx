import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Play, Flame } from 'lucide-react-native';
import { useFastingStore } from '@/lib/stores/fastingStore';
import { Colors } from '@/constants/theme';

interface FastingWidgetProps {
  onOpenTimer?: () => void;
}

export const FastingWidget = ({ onOpenTimer }: FastingWidgetProps) => {
  const store = useFastingStore();
  const session = store.history.currentSession;

  const [displayTime, setDisplayTime] = useState({ hours: 0, minutes: 0 });
  const [percentComplete, setPercentComplete] = useState(0);

  // Update timer every second
  useEffect(() => {
    if (!session?.isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - session.startTime;

      const totalSeconds = Math.floor(elapsedMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      setDisplayTime({ hours, minutes });

      // Calculate target and percent
      const targetHours = session.customHours || (session.protocol === '16:8' ? 16 : 18);
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      setPercentComplete(Math.min((elapsedHours / targetHours) * 100, 100));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.isActive, session?.startTime, session?.customHours, session?.protocol]);

  if (!session?.isActive) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onOpenTimer?.();
        }}
        className="rounded-2xl p-5 bg-gradient-to-br from-green-600 to-green-700 mb-4 active:opacity-75"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium mb-1" style={{ color: Colors.textPrimary }}>
              Intermittent Fasting
            </Text>
            <Text className="text-lg font-bold" style={{ color: Colors.textPrimary }}>
              Start Your Fast
            </Text>
          </View>
          <Play width={24} height={24} color="white" fill="white" />
        </View>
      </Pressable>
    );
  }

  // Active fasting session
  const circumference = 2 * Math.PI * 45;
  const targetHours = session.customHours || (session.protocol === '16:8' ? 16 : 18);
  const offset = circumference - (percentComplete / 100) * circumference;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onOpenTimer?.();
      }}
      className="rounded-2xl p-4 mb-4 active:opacity-75"
      style={{ backgroundColor: Colors.navyCard }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-2">
            <Flame width={16} height={16} color={Colors.green} fill={Colors.green} />
            <Text className="text-xs font-medium" style={{ color: Colors.textSecondary }}>
              Fasting Active
            </Text>
          </View>
          <Text className="text-2xl font-bold" style={{ color: Colors.textPrimary }}>
            {displayTime.hours}h {displayTime.minutes}m
          </Text>
          <Text className="text-xs mt-1" style={{ color: Colors.textSecondary }}>
            {Math.round(percentComplete)}% of {targetHours}h goal
          </Text>
        </View>

        {/* Mini Progress Ring */}
        <View className="relative">
          <Svg width={100} height={100} viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="45" stroke={Colors.surface} strokeWidth="3" fill="none" />
            <Circle
              cx="50"
              cy="50"
              r="45"
              stroke={Colors.green}
              strokeWidth="3"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation={-90}
              originX="50"
              originY="50"
            />
          </Svg>
          <View className="absolute inset-0 justify-center items-center">
            <Text className="text-base font-bold" style={{ color: Colors.textPrimary }}>
              {Math.round(percentComplete)}%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  Clock,
  Play,
  Pause,
  X,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Check,
} from 'lucide-react-native';
import { useFastingStore, FastingPhase } from '@/lib/stores/fastingStore';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useToast } from '@/components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FastingPhaseInfo {
  name: FastingPhase;
  description: string;
  icon: React.ReactNode;
  color: string;
  startHours: number;
  endHours: number;
}

const FASTING_PHASES: FastingPhaseInfo[] = [
  {
    name: 'Fed State',
    description: 'Body processing last meal, insulin high',
    icon: null,
    color: '#FF6B6B',
    startHours: 0,
    endHours: 3,
  },
  {
    name: 'Early Fasting',
    description: 'Blood sugar dropping, glycogen depleting',
    icon: null,
    color: '#FFA500',
    startHours: 3,
    endHours: 12,
  },
  {
    name: 'Fasting State',
    description: 'Glycogen depleted, ketones increasing',
    icon: null,
    color: '#FFD700',
    startHours: 12,
    endHours: 16,
  },
  {
    name: 'Deep Fasting',
    description: 'Ketones peak, autophagy accelerating',
    icon: null,
    color: '#90EE90',
    startHours: 16,
    endHours: 24,
  },
  {
    name: 'Metabolic Advantage',
    description: 'Maximum fat burning, cellular repair',
    icon: null,
    color: '#2ECC71',
    startHours: 24,
    endHours: 48,
  },
  {
    name: 'Extended Fast',
    description: 'Deep autophagy, immune reset',
    icon: null,
    color: '#27AE60',
    startHours: 48,
    endHours: 999,
  },
];

const PROTOCOL_HOURS: Record<string, number> = {
  '16:8': 16,
  '18:6': 18,
  '20:4': 20,
  OMAD: 23,
  '5:2': 16,
};

export default function FastingTimerScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const store = useFastingStore();
  const session = store.history.currentSession;
  const preferredProtocol = store.preferredProtocol;

  const [displayTime, setDisplayTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentPhase, setCurrentPhase] = useState<FastingPhase>('Fed State');
  const [percentComplete, setPercentComplete] = useState(0);
  const [selectedProtocol, setSelectedProtocol] = useState<string>(preferredProtocol);
  const [customHours, setCustomHours] = useState<string>('');
  const [showProtocolSelector, setShowProtocolSelector] = useState(!session);

  const pulseAnim = useSharedValue(1);

  // Update timer every second
  useEffect(() => {
    if (!session?.isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - session.startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // Calculate target hours
      let targetHours = PROTOCOL_HOURS[session.protocol] || 16;
      if (session.customHours) {
        targetHours = session.customHours;
      }

      // Calculate display time
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setDisplayTime({ hours, minutes, seconds });

      // Calculate percent complete
      const percent = Math.min((elapsedHours / targetHours) * 100, 100);
      setPercentComplete(percent);

      // Update phase
      const phase = store.getCurrentPhase().phase;
      setCurrentPhase(phase);
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.isActive, session?.startTime, session?.protocol, session?.customHours, store]);

  const handleStartFast = () => {
    if (!selectedProtocol && !customHours) {
      showToast('Please select a protocol or enter custom hours', 'error');
      return;
    }

    const hours = customHours ? parseInt(customHours) : undefined;
    if (customHours && (isNaN(hours!) || hours! < 1 || hours! > 72)) {
      showToast('Enter hours between 1 and 72', 'error');
      return;
    }

    store.startFast(selectedProtocol as any, hours);
    store.setPreferredProtocol(selectedProtocol as any);
    setShowProtocolSelector(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Fast started! 🔥', 'success');
  };

  const handleEndFast = () => {
    store.endFast();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Fast completed!', 'success');
  };

  const handleCancelFast = () => {
    store.cancelFast();
    showToast('Fast cancelled', 'info');
  };

  const phaseInfo = FASTING_PHASES.find((p) => p.name === currentPhase) || FASTING_PHASES[0];

  if (!session?.isActive && showProtocolSelector) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.navy }}>
        <ScrollView className="flex-1 px-4">
          <View className="py-8">
            <View className="mb-8">
              <Text className="text-3xl font-bold mb-2" style={{ color: Colors.textPrimary }}>
                Choose Your Fasting Protocol
              </Text>
              <Text className="text-base" style={{ color: Colors.textSecondary }}>
                Select how long you want to fast
              </Text>
            </View>

            {/* Protocol Options */}
            <View className="gap-3 mb-8">
              {Object.entries(PROTOCOL_HOURS).map(([protocol, hours]) => (
                <Pressable
                  key={protocol}
                  onPress={() => {
                    setSelectedProtocol(protocol);
                    setCustomHours('');
                    Haptics.selectionAsync();
                  }}
                  className={`rounded-xl p-4 border-2 ${
                    selectedProtocol === protocol ? 'border-green-500 bg-green-500/10' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: selectedProtocol === protocol ? undefined : Colors.navyCard }}
                >
                  <Text className="text-xl font-bold mb-1" style={{ color: Colors.textPrimary }}>
                    {protocol}
                  </Text>
                  <Text className="text-sm" style={{ color: Colors.textSecondary }}>
                    {hours} hours fasting
                  </Text>
                </Pressable>
              ))}

              {/* Custom Option */}
              <View className="mt-4 rounded-xl p-4" style={{ backgroundColor: Colors.navyCard }}>
                <Text className="text-base font-semibold mb-3" style={{ color: Colors.textPrimary }}>
                  Custom Duration
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    placeholder="Hours (1-72)"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={customHours}
                    onChangeText={setCustomHours}
                    className="flex-1 px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: Colors.navy,
                      borderColor: Colors.surface,
                      color: Colors.textPrimary,
                    }}
                  />
                  <Text style={{ color: Colors.textSecondary }}>hours</Text>
                </View>
              </View>
            </View>

            {/* Start Button */}
            <Pressable
              onPress={handleStartFast}
              className="rounded-xl py-4 bg-green-500 active:opacity-80"
            >
              <Text className="text-center text-lg font-bold text-white">Start Fast</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (session?.isActive) {
    // Active fasting session
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (percentComplete / 100) * circumference;

    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.navy }}>
        <ScrollView className="flex-1">
          {/* Header */}
          <View className="px-4 py-6 flex-row justify-between items-center">
            <Pressable onPress={() => router.back()} className="p-2">
              <Text className="text-green-500 text-base font-semibold">Back</Text>
            </Pressable>
            <Text className="text-xl font-bold" style={{ color: Colors.textPrimary }}>
              Fasting Timer
            </Text>
            <View className="w-10" />
          </View>

          {/* Main Timer */}
          <View className="items-center py-8">
            <View className="relative mb-6">
              {/* Circular Progress */}
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={Colors.surface}
                  strokeWidth="6"
                  fill="none"
                />
                <Circle
                  cx="100"
                  cy="100"
                  r="80"
                  stroke={phaseInfo.color}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  rotation={-90}
                  originX="100"
                  originY="100"
                />
              </Svg>

              {/* Time Display */}
              <View className="absolute inset-0 justify-center items-center">
                <Text className="text-5xl font-bold" style={{ color: Colors.textPrimary }}>
                  {displayTime.hours.toString().padStart(2, '0')}
                </Text>
                <Text className="text-sm mt-1" style={{ color: Colors.textSecondary }}>
                  {displayTime.minutes.toString().padStart(2, '0')}m
                  {displayTime.seconds.toString().padStart(2, '0')}s
                </Text>
              </View>
            </View>

            {/* Percent Complete */}
            <Text className="text-base font-semibold mb-4" style={{ color: Colors.green }}>
              {Math.round(percentComplete)}% Complete
            </Text>
          </View>

          {/* Current Phase */}
          <View className="mx-4 rounded-xl p-5 mb-6" style={{ backgroundColor: Colors.navyCard }}>
            <View className="flex-row items-center mb-3">
              <View
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: phaseInfo.color }}
              />
              <Text className="text-xl font-bold" style={{ color: Colors.textPrimary }}>
                {currentPhase}
              </Text>
            </View>
            <Text className="text-sm" style={{ color: Colors.textSecondary }}>
              {phaseInfo.description}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="mx-4 gap-3 mb-8">
            <Pressable
              onPress={handleEndFast}
              className="rounded-xl py-4 bg-green-500 active:opacity-80 flex-row justify-center items-center gap-2"
            >
              <Check width={20} height={20} color="white" />
              <Text className="text-lg font-bold text-white">Complete Fast</Text>
            </Pressable>

            <Pressable
              onPress={handleCancelFast}
              className="rounded-xl py-4 border-2 border-red-500/50 active:opacity-80 flex-row justify-center items-center gap-2"
            >
              <X width={20} height={20} color={Colors.error} />
              <Text className="text-lg font-bold" style={{ color: Colors.error }}>
                Cancel Fast
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: Colors.navy }}>
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-2xl font-bold mb-4" style={{ color: Colors.textPrimary }}>
          No Active Fast
        </Text>
        <Pressable onPress={() => setShowProtocolSelector(true)} className="rounded-xl py-4 px-6 bg-green-500">
          <Text className="text-lg font-bold text-white">Start a Fast</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

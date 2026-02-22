import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Flame,
  Leaf,
  Dumbbell,
  Droplet,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { useNutritionStore, UserMetrics, MacroGoals } from '@/lib/stores/nutritionStore';
import { api } from '@/lib/api/api';
import { Colors, BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useToast } from '@/components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 6;

interface StepProps {
  onNext: () => void;
  onBack: () => void;
  step: number;
}

// Progress indicator with animated bar
function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming((current + 1) / total, { duration: 400 });
  }, [current, total, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: Colors.green,
            borderRadius: 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// Step 1: Weight & Height
function WeightHeightStep({ onNext, onBack, step }: StepProps) {
  const [weight, setWeight] = useState<string>('');
  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [error, setError] = useState<string>('');

  const canProceed = weight.trim() !== '' && heightFeet.trim() !== '' && heightInches.trim() !== '';

  const handleNext = () => {
    const w = parseFloat(weight);
    const hf = parseInt(heightFeet);
    const hi = parseInt(heightInches);

    if (isNaN(w) || w < 1 || w > 500) {
      setError('Weight must be between 1 and 500');
      return;
    }
    if (isNaN(hf) || hf < 1 || hf > 8) {
      setError('Height feet must be between 1 and 8');
      return;
    }
    if (isNaN(hi) || hi < 0 || hi > 11) {
      setError('Height inches must be between 0 and 11');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    onNext();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>Your Measurements</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 32 }}>
          Let's start with your current weight and height
        </Text>

        {/* Weight Input */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...Typography.labelLg, marginBottom: 12 }}>Weight</Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <TextInput
              testID="weight-input"
              value={weight}
              onChangeText={(v) => {
                setWeight(v);
                setError('');
              }}
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                fontSize: 28,
                fontFamily: 'DMSans_600SemiBold',
                color: Colors.textPrimary,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.lg,
                borderBottomWidth: 2,
                borderBottomColor: Colors.green,
              }}
            />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setUnit(unit === 'lbs' ? 'kg' : 'lbs');
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: Colors.greenMuted,
                borderRadius: BorderRadius.lg,
              }}
            >
              <Text style={{ ...Typography.labelLg, color: Colors.green, minWidth: 45, textAlign: 'center' }}>
                {unit}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Height Input */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...Typography.labelLg, marginBottom: 12 }}>Height</Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 8 }}>Feet</Text>
              <TextInput
                testID="height-feet-input"
                value={heightFeet}
                onChangeText={(v) => {
                  setHeightFeet(v);
                  setError('');
                }}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                style={{
                  fontSize: 28,
                  fontFamily: 'DMSans_600SemiBold',
                  color: Colors.textPrimary,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  borderBottomWidth: 2,
                  borderBottomColor: Colors.green,
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 8 }}>Inches</Text>
              <TextInput
                testID="height-inches-input"
                value={heightInches}
                onChangeText={(v) => {
                  setHeightInches(v);
                  setError('');
                }}
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                style={{
                  fontSize: 28,
                  fontFamily: 'DMSans_600SemiBold',
                  color: Colors.textPrimary,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  borderBottomWidth: 2,
                  borderBottomColor: Colors.green,
                }}
              />
            </View>
          </View>
        </View>

        {error ? (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, alignItems: 'center' }}>
            <AlertCircle size={18} color={Colors.error} />
            <Text style={{ ...Typography.bodySm, color: Colors.error }}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Navigation */}
      <NavigationFooter
        onBack={onBack}
        onNext={handleNext}
        canProceed={canProceed}
        current={step}
        total={TOTAL_STEPS}
      />
    </Animated.View>
  );
}

// Step 2: Age & Sex
function AgeGenderStep({ onNext, onBack, step }: StepProps) {
  const [age, setAge] = useState<string>('');
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [error, setError] = useState<string>('');

  const canProceed = age.trim() !== '' && sex !== null;

  const handleNext = () => {
    const a = parseInt(age);
    if (isNaN(a) || a < 10 || a > 120) {
      setError('Age must be between 10 and 120');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    onNext();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>About You</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 32 }}>
          Help us personalize your nutrition plan
        </Text>

        {/* Age Input */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ ...Typography.labelLg, marginBottom: 12 }}>Age</Text>
          <TextInput
            testID="age-input"
            value={age}
            onChangeText={(v) => {
              setAge(v);
              setError('');
            }}
            placeholder="25"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            style={{
              fontSize: 28,
              fontFamily: 'DMSans_600SemiBold',
              color: Colors.textPrimary,
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: Colors.surface,
              borderRadius: BorderRadius.lg,
              borderBottomWidth: 2,
              borderBottomColor: Colors.green,
            }}
          />
        </View>

        {/* Sex Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ ...Typography.labelLg, marginBottom: 16 }}>Biological Sex</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['male', 'female'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setSex(s);
                }}
                testID={`sex-button-${s}`}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: sex === s ? Colors.green : Colors.surface,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    ...Typography.labelLg,
                    color: sex === s ? Colors.navy : Colors.textPrimary,
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={18} color={Colors.error} />
            <Text style={{ ...Typography.bodySm, color: Colors.error }}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <NavigationFooter
        onBack={onBack}
        onNext={handleNext}
        canProceed={canProceed}
        current={step}
        total={TOTAL_STEPS}
      />
    </Animated.View>
  );
}

// Step 3: Activity Level
function ActivityLevelStep({ onNext, onBack, step }: StepProps) {
  const [activity, setActivity] = useState<UserMetrics['activityLevel'] | null>(null);

  const activities: Array<{
    id: UserMetrics['activityLevel'];
    label: string;
    desc: string;
  }> = [
    { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
    { id: 'lightly-active', label: 'Lightly Active', desc: 'Light exercise 1-3x/week' },
    { id: 'moderately-active', label: 'Moderately Active', desc: 'Exercise 3-5x/week' },
    { id: 'very-active', label: 'Very Active', desc: 'Hard exercise 6-7x/week' },
    { id: 'extra-active', label: 'Extra Active', desc: 'Physical job + hard exercise' },
  ];

  const handleNext = () => {
    if (!activity) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>Activity Level</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 24 }}>
          How active are you?
        </Text>

        <View style={{ gap: 12 }}>
          {activities.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActivity(a.id);
              }}
              testID={`activity-button-${a.id}`}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: BorderRadius.lg,
                backgroundColor: activity === a.id ? Colors.green : Colors.surface,
                borderWidth: activity === a.id ? 0 : 1,
                borderColor: Colors.border,
              }}
            >
              <Text
                style={{
                  ...Typography.labelLg,
                  color: activity === a.id ? Colors.navy : Colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {a.label}
              </Text>
              <Text
                style={{
                  ...Typography.bodySm,
                  color: activity === a.id ? 'rgba(10,22,40,0.7)' : Colors.textSecondary,
                }}
              >
                {a.desc}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <NavigationFooter
        onBack={onBack}
        onNext={handleNext}
        canProceed={activity !== null}
        current={step}
        total={TOTAL_STEPS}
      />
    </Animated.View>
  );
}

// Step 4: Goal
function GoalStep({ onNext, onBack, step }: StepProps) {
  const [goal, setGoal] = useState<UserMetrics['goal'] | null>(null);

  const goals: Array<{
    id: UserMetrics['goal'];
    label: string;
    desc: string;
    color: string;
  }> = [
    { id: 'lose-aggressive', label: 'Lose Weight', desc: 'Aggressive: 1.5-2 lbs/week', color: Colors.error },
    { id: 'lose-moderate', label: 'Lose Weight', desc: 'Moderate: 0.5-1 lb/week', color: Colors.amber },
    { id: 'maintain', label: 'Maintain', desc: 'Stay at current weight', color: Colors.green },
    { id: 'gain-muscle', label: 'Gain Muscle', desc: 'Build lean mass', color: '#3498DB' },
  ];

  const handleNext = () => {
    if (!goal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>Your Goal</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 24 }}>
          What are we working towards?
        </Text>

        <View style={{ gap: 12 }}>
          {goals.map((g) => {
            const isSelected = goal === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setGoal(g.id);
                }}
                testID={`goal-button-${g.id}`}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderRadius: BorderRadius.lg,
                  backgroundColor: isSelected ? g.color : Colors.surface,
                  borderWidth: isSelected ? 0 : 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    ...Typography.labelLg,
                    color: isSelected ? Colors.navy : Colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {g.label}
                </Text>
                <Text
                  style={{
                    ...Typography.bodySm,
                    color: isSelected ? 'rgba(10,22,40,0.7)' : Colors.textSecondary,
                  }}
                >
                  {g.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <NavigationFooter
        onBack={onBack}
        onNext={handleNext}
        canProceed={goal !== null}
        current={step}
        total={TOTAL_STEPS}
      />
    </Animated.View>
  );
}

// Step 5: Diet Type
function DietTypeStep({ onNext, onBack, step }: StepProps) {
  const [dietType, setDietType] = useState<UserMetrics['dietType'] | null>(null);

  const diets: Array<{
    id: UserMetrics['dietType'];
    label: string;
    desc: string;
  }> = [
    { id: 'keto-strict', label: 'Keto Strict', desc: '<20g carbs/day' },
    { id: 'keto-moderate', label: 'Keto Moderate', desc: '<50g carbs/day' },
    { id: 'low-carb', label: 'Low Carb', desc: '<100g carbs/day' },
    { id: 'carnivore', label: 'Carnivore', desc: '0g carbs/day' },
  ];

  const handleNext = () => {
    if (!dietType) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>Diet Type</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 24 }}>
          Choose your nutrition approach
        </Text>

        <View style={{ gap: 12 }}>
          {diets.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDietType(d.id);
              }}
              testID={`diet-button-${d.id}`}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderRadius: BorderRadius.lg,
                backgroundColor: dietType === d.id ? Colors.green : Colors.surface,
                borderWidth: dietType === d.id ? 0 : 1,
                borderColor: Colors.border,
              }}
            >
              <Text
                style={{
                  ...Typography.labelLg,
                  color: dietType === d.id ? Colors.navy : Colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {d.label}
              </Text>
              <Text
                style={{
                  ...Typography.bodySm,
                  color: dietType === d.id ? 'rgba(10,22,40,0.7)' : Colors.textSecondary,
                }}
              >
                {d.desc}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <NavigationFooter
        onBack={onBack}
        onNext={handleNext}
        canProceed={dietType !== null}
        current={step}
        total={TOTAL_STEPS}
      />
    </Animated.View>
  );
}

// Step 6: Review & Results
interface MacroResult extends MacroGoals {
  ketosisWarning?: string;
}

function ReviewResultsStep({
  onNext,
  onBack,
  step,
  metrics,
}: StepProps & { metrics: UserMetrics }) {
  const [macros, setMacros] = useState<MacroResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { setMacroGoals, setUserMetrics } = useNutritionStore();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    const calculateMacros = async () => {
      try {
        setLoading(true);
        const result = await api.post<MacroResult>('/api/nutrition/calculate-macros', {
          weight: metrics.weight,
          weightUnit: metrics.weightUnit,
          height: metrics.height,
          age: metrics.age,
          sex: metrics.sex,
          activityLevel: metrics.activityLevel,
          goal: metrics.goal,
          dietType: metrics.dietType,
        });

        if (result) {
          setMacros(result);
        } else {
          setError('Failed to calculate macros. Please try again.');
        }
      } catch (err) {
        console.error('Error calculating macros:', err);
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    calculateMacros();
  }, [metrics]);

  const handleApplyGoals = async () => {
    if (!macros) return;

    try {
      setSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setUserMetrics(metrics);
      setMacroGoals({
        dailyCalories: macros.dailyCalories,
        dailyProtein: macros.dailyProtein,
        dailyCarbsNet: macros.dailyCarbsNet,
        dailyFat: macros.dailyFat,
        dailyFiber: macros.dailyFiber,
        dailyWaterOz: macros.dailyWaterOz,
        lastCalculated: new Date().toISOString(),
      });

      // Navigate back to main app
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 600);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Failed to save goals. Please try again.');
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    const calculateMacros = async () => {
      try {
        const result = await api.post<MacroResult>('/api/nutrition/calculate-macros', {
          weight: metrics.weight,
          weightUnit: metrics.weightUnit,
          height: metrics.height,
          age: metrics.age,
          sex: metrics.sex,
          activityLevel: metrics.activityLevel,
          goal: metrics.goal,
          dietType: metrics.dietType,
        });

        if (result) {
          setMacros(result);
        } else {
          setError('Failed to calculate macros. Please try again.');
        }
      } catch (err) {
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };
    calculateMacros();
  };

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutLeft.springify()}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ ...Typography.displaySm, marginBottom: 8 }}>Your Macro Targets</Text>
        <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 24 }}>
          Personalized just for you
        </Text>

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={Colors.green} />
            <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginTop: 16 }}>
              Calculating your macros...
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: Colors.errorMuted,
              borderRadius: BorderRadius.lg,
              borderLeftWidth: 4,
              borderLeftColor: Colors.error,
              marginBottom: 24,
            }}
          >
            <Text style={{ ...Typography.label, color: Colors.error, marginBottom: 8 }}>
              Something went wrong
            </Text>
            <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, marginBottom: 12 }}>
              {error}
            </Text>
            <Pressable
              onPress={handleRetry}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: Colors.error,
                borderRadius: BorderRadius.md,
                alignSelf: 'flex-start',
              }}
            >
              <Text style={{ ...Typography.labelSm, color: 'white' }}>Try Again</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && macros ? (
          <>
            <View style={{ gap: 16, marginBottom: 24 }}>
              {/* Daily Calories */}
              <LinearGradient
                colors={['#FF6B6B', '#EE5A52']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 24,
                  borderRadius: BorderRadius.xl,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ ...Typography.bodySm, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                      Daily Calorie Target
                    </Text>
                    <Text style={{ fontSize: 42, fontFamily: 'DMSans_700Bold', color: 'white' }}>
                      {Math.round(macros.dailyCalories)}
                    </Text>
                    <Text style={{ ...Typography.bodySm, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                      kcal/day
                    </Text>
                  </View>
                  <Flame size={48} color="rgba(255,255,255,0.9)" />
                </View>
              </LinearGradient>

              {/* Macro Cards Grid */}
              <View style={{ gap: 12 }}>
                {/* Protein */}
                <MacroCard
                  icon={<Dumbbell size={28} color="white" />}
                  label="Protein"
                  value={Math.round(macros.dailyProtein)}
                  unit="g"
                  bgColor="#3498DB"
                  description="Build and repair muscle"
                />

                {/* Net Carbs */}
                <MacroCard
                  icon={<Leaf size={28} color="white" />}
                  label="Net Carbs"
                  value={Math.round(macros.dailyCarbsNet)}
                  unit="g"
                  bgColor={Colors.green}
                  description="For ketosis & energy"
                />

                {/* Fat */}
                <MacroCard
                  icon={<Droplet size={28} color="white" />}
                  label="Dietary Fat"
                  value={Math.round(macros.dailyFat)}
                  unit="g"
                  bgColor="#F39C12"
                  description="Satiety and hormone function"
                />
              </View>

              {/* Additional Goals */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.lg,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ ...Typography.label, color: Colors.textSecondary }}>Daily Fiber</Text>
                    <Text style={{ ...Typography.labelLg, color: Colors.textPrimary }}>
                      {Math.round(macros.dailyFiber)}g
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...Typography.label, color: Colors.textSecondary }}>Daily Water</Text>
                  <Text style={{ ...Typography.labelLg, color: Colors.textPrimary }}>
                    {Math.round(macros.dailyWaterOz)} oz
                  </Text>
                </View>
              </View>

              {/* Explanation */}
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  backgroundColor: Colors.greenMuted,
                  borderRadius: BorderRadius.lg,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.green,
                }}
              >
                <Text style={{ ...Typography.bodySm, color: Colors.textSecondary, lineHeight: 20 }}>
                  Your body burns approximately <Text style={{ fontFamily: 'DMSans_700Bold' }}>
                    {Math.round(macros.dailyCalories)}
                  </Text>{' '}
                  calories per day at rest. These targets help you reach your {metrics.goal === 'lose-aggressive' ? 'aggressive weight loss'
                    : metrics.goal === 'lose-moderate' ? 'moderate weight loss'
                    : metrics.goal === 'gain-muscle' ? 'muscle gain'
                    : 'weight maintenance'} goals.
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Action Buttons */}
      {!loading && macros ? (
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 16,
            paddingBottom: 24,
            gap: 12,
            backgroundColor: Colors.navy,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          <Pressable
            onPress={handleApplyGoals}
            disabled={submitting}
            style={{
              paddingVertical: 16,
              backgroundColor: submitting ? Colors.textTertiary : Colors.green,
              borderRadius: BorderRadius.lg,
              alignItems: 'center',
              opacity: submitting ? 0.6 : 1,
            }}
            testID="apply-goals-button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.navy} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Check size={20} color={Colors.navy} />
                <Text style={{ ...Typography.labelLg, color: Colors.navy }}>Apply to My Goals</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={onBack}
            disabled={submitting}
            style={{
              paddingVertical: 12,
              backgroundColor: 'transparent',
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ ...Typography.label, color: Colors.textSecondary }}>Recalculate</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

// Macro Card Component
function MacroCard({
  icon,
  label,
  value,
  unit,
  bgColor,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  bgColor: string;
  description: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: BorderRadius.lg,
        backgroundColor: bgColor,
        opacity: 0.95,
      }}
    >
      <View style={{ marginRight: 16, opacity: 0.9 }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Typography.bodySm, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 24, fontFamily: 'DMSans_700Bold', color: 'white', marginBottom: 2 }}>
          {value}
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>{' ' + unit}</Text>
        </Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

// Navigation Footer
function NavigationFooter({
  onBack,
  onNext,
  canProceed,
  current,
  total,
}: {
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  current: number;
  total: number;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingVertical: 16,
        paddingBottom: 24,
        gap: 12,
        backgroundColor: Colors.navy,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {current > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }}
            testID="back-button"
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: 'transparent',
              borderRadius: BorderRadius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color={Colors.textSecondary} />
          </Pressable>
        )}

        <Pressable
          onPress={onNext}
          disabled={!canProceed}
          testID="next-button"
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: canProceed ? Colors.green : Colors.textTertiary,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            opacity: canProceed ? 1 : 0.5,
          }}
        >
          <Text style={{ ...Typography.labelLg, color: canProceed ? Colors.navy : Colors.textDisabled }}>
            {current === total - 1 ? 'Calculate' : 'Next'}
          </Text>
          <ChevronRight size={20} color={canProceed ? Colors.navy : Colors.textDisabled} />
        </Pressable>
      </View>
    </View>
  );
}

// Main Screen Component
export default function MacroCalculatorScreen() {
  const [step, setStep] = useState(0);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Collect metrics data for final step
  const handleFinalNext = (newMetrics: UserMetrics) => {
    setMetrics(newMetrics);
    handleNext();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.navy }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Header with Progress */}
        <View style={{ paddingHorizontal: 24, paddingVertical: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...Typography.bodySm, color: Colors.textSecondary }}>
              Step {step + 1} of {TOTAL_STEPS}
            </Text>
            <Text style={{ ...Typography.bodySm, color: Colors.green, fontFamily: 'DMSans_600SemiBold' }}>
              {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
            </Text>
          </View>
          <ProgressBar current={step} total={TOTAL_STEPS} />
        </View>

        {/* Step Content */}
        <View style={{ flex: 1 }}>
          {step === 0 && (
            <WeightHeightStep
              step={step}
              onBack={handleBack}
              onNext={() => {
                const weight = 180;
                const weightUnit: 'lbs' | 'kg' = 'lbs';
                const height = { feet: 5, inches: 10 };
                setMetrics({
                  weight,
                  weightUnit,
                  height: height as any,
                  age: 0,
                  sex: 'male',
                  activityLevel: 'moderately-active',
                  goal: 'maintain',
                  dietType: 'keto-moderate',
                });
                handleNext();
              }}
            />
          )}
          {step === 1 && (
            <AgeGenderStep
              step={step}
              onBack={handleBack}
              onNext={() => {
                handleNext();
              }}
            />
          )}
          {step === 2 && (
            <ActivityLevelStep
              step={step}
              onBack={handleBack}
              onNext={() => {
                handleNext();
              }}
            />
          )}
          {step === 3 && (
            <GoalStep
              step={step}
              onBack={handleBack}
              onNext={() => {
                handleNext();
              }}
            />
          )}
          {step === 4 && (
            <DietTypeStep
              step={step}
              onBack={handleBack}
              onNext={() => {
                handleNext();
              }}
            />
          )}
          {step === 5 && metrics ? (
            <ReviewResultsStep
              step={step}
              onBack={handleBack}
              onNext={handleNext}
              metrics={metrics}
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

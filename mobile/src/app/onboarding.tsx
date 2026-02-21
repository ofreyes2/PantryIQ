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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChefHat, Heart, ShoppingCart, Check, ArrowRight, Scan, Plus } from 'lucide-react-native';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOTAL_STEPS = 6;

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
  step: number;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? Colors.green : Colors.border,
          }}
        />
      ))}
    </View>
  );
}

function WelcomeStep({ onNext }: StepProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          backgroundColor: Colors.greenMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <ChefHat size={40} color={Colors.green} />
      </View>

      <Text
        style={{
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 42,
          color: Colors.textPrimary,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        PantryIQ
      </Text>

      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 16,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 48,
        }}
      >
        Your Kitchen. Your Health.{'\n'}Perfectly Managed.
      </Text>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
        style={({ pressed }) => ({
          backgroundColor: Colors.green,
          paddingHorizontal: 48,
          paddingVertical: 16,
          borderRadius: BorderRadius.full,
          opacity: pressed ? 0.85 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        })}
        testID="get-started-button"
      >
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#0A1628' }}>
          Get Started
        </Text>
        <ArrowRight size={18} color="#0A1628" />
      </Pressable>
    </View>
  );
}

function AboutYouStep({
  onNext,
  onBack,
  data,
  onChange,
}: StepProps & {
  data: { name: string; age: string; feet: string; inches: string };
  onChange: (d: { name: string; age: string; feet: string; inches: string }) => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 30,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Tell us about you
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: Colors.textSecondary,
            marginBottom: 32,
          }}
        >
          Personalize your experience
        </Text>

        <Text style={labelStyle}>Your Name</Text>
        <TextInput
          value={data.name}
          onChangeText={(v) => onChange({ ...data, name: v })}
          placeholder="e.g. Alex"
          placeholderTextColor={Colors.textTertiary}
          style={inputStyle}
          testID="name-input"
        />

        <Text style={labelStyle}>Age</Text>
        <TextInput
          value={data.age}
          onChangeText={(v) => onChange({ ...data, age: v })}
          placeholder="e.g. 28"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          style={inputStyle}
          testID="age-input"
        />

        <Text style={labelStyle}>Height</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TextInput
            value={data.feet}
            onChangeText={(v) => onChange({ ...data, feet: v })}
            placeholder="ft"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1 }]}
            testID="height-feet-input"
          />
          <TextInput
            value={data.inches}
            onChangeText={(v) => onChange({ ...data, inches: v })}
            placeholder="in"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            style={[inputStyle, { flex: 1 }]}
            testID="height-inches-input"
          />
        </View>

        <NavButtons onNext={onNext} onBack={onBack} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GoalsStep({
  onNext,
  onBack,
  data,
  onChange,
}: StepProps & {
  data: { dailyCarbs: string; dailyCalories: string; startWeight: string; goalWeight: string };
  onChange: (d: {
    dailyCarbs: string;
    dailyCalories: string;
    startWeight: string;
    goalWeight: string;
  }) => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 30,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Set your goals
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: Colors.textSecondary,
            marginBottom: 32,
          }}
        >
          We'll track these daily for you
        </Text>

        <Text style={labelStyle}>Daily Carb Target (grams)</Text>
        <TextInput
          value={data.dailyCarbs}
          onChangeText={(v) => onChange({ ...data, dailyCarbs: v })}
          placeholder="50"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          style={inputStyle}
          testID="carbs-input"
        />

        <Text style={labelStyle}>Daily Calorie Target</Text>
        <TextInput
          value={data.dailyCalories}
          onChangeText={(v) => onChange({ ...data, dailyCalories: v })}
          placeholder="1800"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="number-pad"
          style={inputStyle}
          testID="calories-input"
        />

        <Text style={labelStyle}>Starting Weight (lbs)</Text>
        <TextInput
          value={data.startWeight}
          onChangeText={(v) => onChange({ ...data, startWeight: v })}
          placeholder="e.g. 185"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          style={inputStyle}
          testID="start-weight-input"
        />

        <Text style={labelStyle}>Goal Weight (lbs)</Text>
        <TextInput
          value={data.goalWeight}
          onChangeText={(v) => onChange({ ...data, goalWeight: v })}
          placeholder="e.g. 165"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="decimal-pad"
          style={inputStyle}
          testID="goal-weight-input"
        />

        <NavButtons onNext={onNext} onBack={onBack} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ApiStep({
  onNext,
  onBack,
  data,
  onChange,
}: StepProps & {
  data: { claudeKey: string; usdaKey: string };
  onChange: (d: { claudeKey: string; usdaKey: string }) => void;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 30,
            color: Colors.textPrimary,
            marginBottom: 8,
          }}
        >
          Connect your APIs
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: Colors.textSecondary,
            marginBottom: 8,
          }}
        >
          Optional — unlock AI-powered features
        </Text>
        <View
          style={{
            backgroundColor: Colors.amberMuted,
            borderRadius: BorderRadius.md,
            padding: 12,
            marginBottom: 28,
          }}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.amber }}
          >
            Keys are stored only on your device and never shared.
          </Text>
        </View>

        <Text style={labelStyle}>Claude API Key</Text>
        <TextInput
          value={data.claudeKey}
          onChangeText={(v) => onChange({ ...data, claudeKey: v })}
          placeholder="sk-ant-..."
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
          style={inputStyle}
          testID="claude-key-input"
        />

        <Text style={labelStyle}>USDA FoodData API Key</Text>
        <TextInput
          value={data.usdaKey}
          onChangeText={(v) => onChange({ ...data, usdaKey: v })}
          placeholder="Optional"
          placeholderTextColor={Colors.textTertiary}
          style={inputStyle}
          testID="usda-key-input"
        />

        <NavButtons onNext={onNext} onBack={onBack} skipLabel="Skip for now" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FeatureTourStep({ onNext, onBack }: StepProps) {
  const features = [
    {
      icon: <Scan size={32} color={Colors.green} />,
      title: 'Scan & Track',
      desc: 'Scan barcodes or snap a photo to instantly log food items to your pantry.',
    },
    {
      icon: <ChefHat size={32} color={Colors.amber} />,
      title: 'Plan Meals',
      desc: 'AI-powered meal suggestions based on what you have and your health goals.',
    },
    {
      icon: <Heart size={32} color="#E74C3C" />,
      title: 'Track Health',
      desc: 'Monitor weight, macros, and streaks. See your progress over time.',
    },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      <Text
        style={{
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 30,
          color: Colors.textPrimary,
          marginBottom: 8,
        }}
      >
        Everything you need
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 15,
          color: Colors.textSecondary,
          marginBottom: 28,
        }}
      >
        Three powerful tools, one kitchen companion
      </Text>

      <View style={{ gap: 16, flex: 1 }}>
        {features.map((f, i) => (
          <View
            key={i}
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.xl,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: BorderRadius.md,
                backgroundColor: Colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {f.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 16,
                  color: Colors.textPrimary,
                  marginBottom: 4,
                }}
              >
                {f.title}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 13,
                  color: Colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <NavButtons onNext={onNext} onBack={onBack} />
    </View>
  );
}

function AllSetStep({ onNext }: StepProps) {
  const scale = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Animated.View
        style={[
          {
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: Colors.greenMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            borderWidth: 2,
            borderColor: Colors.green,
          },
          animStyle,
        ]}
      >
        <Check size={48} color={Colors.green} strokeWidth={2.5} />
      </Animated.View>

      <Text
        style={{
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 34,
          color: Colors.textPrimary,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        You're all set!
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 16,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 48,
        }}
      >
        Your kitchen intelligence is ready.{'\n'}Let's start managing your pantry.
      </Text>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext();
        }}
        style={({ pressed }) => ({
          backgroundColor: Colors.green,
          paddingHorizontal: 48,
          paddingVertical: 16,
          borderRadius: BorderRadius.full,
          opacity: pressed ? 0.85 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        })}
        testID="go-to-dashboard-button"
      >
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#0A1628' }}>
          Go to Dashboard
        </Text>
        <ArrowRight size={18} color="#0A1628" />
      </Pressable>
    </View>
  );
}

function NavButtons({
  onNext,
  onBack,
  skipLabel,
}: {
  onNext: () => void;
  onBack?: () => void;
  skipLabel?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 32,
        gap: 12,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => ({
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: BorderRadius.full,
            borderWidth: 1,
            borderColor: Colors.border,
            opacity: pressed ? 0.7 : 1,
          })}
          testID="back-button"
        >
          <Text
            style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: Colors.textSecondary }}
          >
            Back
          </Text>
        </Pressable>
      ) : (
        <View />
      )}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onNext();
        }}
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: Colors.green,
          paddingVertical: 14,
          borderRadius: BorderRadius.full,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
        testID="next-button"
      >
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#0A1628' }}>
          {skipLabel ?? 'Continue'}
        </Text>
      </Pressable>
    </View>
  );
}

const labelStyle = {
  fontFamily: 'DMSans_500Medium' as const,
  fontSize: 13,
  color: Colors.textSecondary,
  marginBottom: 8,
  marginTop: 4,
};

const inputStyle = {
  backgroundColor: Colors.surface,
  borderRadius: BorderRadius.md,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 15,
  fontFamily: 'DMSans_400Regular' as const,
  color: Colors.textPrimary,
  borderWidth: 1,
  borderColor: Colors.border,
  marginBottom: 16,
};

export default function OnboardingScreen() {
  const router = useRouter();
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const [step, setStep] = useState(0);
  const translateX = useSharedValue(0);

  const [aboutData, setAboutData] = useState({ name: '', age: '', feet: '', inches: '' });
  const [goalsData, setGoalsData] = useState({
    dailyCarbs: '50',
    dailyCalories: '1800',
    startWeight: '',
    goalWeight: '',
  });
  const [apiData, setApiData] = useState({ claudeKey: '', usdaKey: '' });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const goToStep = (next: number) => {
    const direction = next > step ? -1 : 1;
    translateX.value = withTiming(direction * SCREEN_WIDTH, { duration: 1 }, () => {
      runOnJS(setStep)(next);
      translateX.value = -direction * SCREEN_WIDTH;
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  const handleFinish = () => {
    setUserProfile({
      name: aboutData.name,
      age: aboutData.age ? parseInt(aboutData.age) : null,
      height:
        aboutData.feet
          ? { feet: parseInt(aboutData.feet) || 5, inches: parseInt(aboutData.inches) || 0 }
          : null,
      dailyCarbGoal: parseInt(goalsData.dailyCarbs) || 50,
      dailyCalorieGoal: parseInt(goalsData.dailyCalories) || 1800,
      startingWeight: goalsData.startWeight ? parseFloat(goalsData.startWeight) : null,
      targetWeight: goalsData.goalWeight ? parseFloat(goalsData.goalWeight) : null,
      claudeApiKey: apiData.claudeKey,
      usdaApiKey: apiData.usdaKey,
    });
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  const stepProps: StepProps = { onNext: handleNext, onBack: handleBack, step };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <WelcomeStep {...stepProps} onBack={undefined} />;
      case 1:
        return (
          <AboutYouStep {...stepProps} data={aboutData} onChange={setAboutData} />
        );
      case 2:
        return (
          <GoalsStep {...stepProps} data={goalsData} onChange={setGoalsData} />
        );
      case 3:
        return (
          <ApiStep {...stepProps} data={apiData} onChange={setApiData} />
        );
      case 4:
        return <FeatureTourStep {...stepProps} />;
      case 5:
        return <AllSetStep {...stepProps} onNext={handleFinish} />;
      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={['#0A1628', '#0F2040', '#0A1628']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} testID="onboarding-screen">
        <View style={{ paddingTop: 16, paddingHorizontal: 24 }}>
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <ProgressDots current={step - 1} total={TOTAL_STEPS - 2} />
          )}
        </View>

        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          {renderStep()}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  useAnimatedProps,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Scan,
  Plus,
  Activity,
  ChefHat,
  AlertCircle,
  TrendingDown,
  Utensils,
  Apple,
  Droplets,
  Flame,
} from 'lucide-react-native';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useRouter, router } from 'expo-router';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius, Spacing, Shadows } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockCaloriesConsumed = 1240;
const mockCaloriesGoal = 1800;
const mockCarbsConsumed = 32;
const mockCarbsGoal = 50;

const mockMeals = [
  { id: '1', name: 'Grilled Salmon Bowl', cal: 520, category: 'lunch', color: '#1A6B5E' },
  { id: '2', name: 'Avocado Toast', cal: 340, category: 'breakfast', color: '#2D5016' },
  { id: '3', name: 'Greek Salad', cal: 280, category: 'dinner', color: '#0D4A6B' },
];

const mockLowStock = [
  { id: '1', name: 'Olive Oil', remaining: '15%' },
  { id: '2', name: 'Greek Yogurt', remaining: '20%' },
];

const mockActivity = [
  { id: '1', icon: '🥗', text: 'Logged Greek Salad for dinner', time: '2h ago' },
  { id: '2', icon: '⚖️', text: 'Weighed in at 178.4 lbs', time: '6h ago' },
  { id: '3', icon: '🛒', text: 'Added 5 items to pantry', time: '1d ago' },
  { id: '4', icon: '🍳', text: 'Cooked Scrambled Eggs', time: '1d ago' },
  { id: '5', icon: '📊', text: 'Hit daily carb goal', time: '2d ago' },
];

const mockWeightData = [178.8, 179.1, 178.5, 178.9, 178.2, 178.6, 178.4];

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function CircularProgress({
  percentage,
  size = 110,
  strokeWidth = 10,
  color = Colors.green,
  label,
  sublabel,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  sublabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${center},${center}`}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 18,
              color: Colors.textPrimary,
              lineHeight: 22,
            }}
          >
            {Math.round(clampedPct)}%
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 13,
          color: Colors.textPrimary,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: Colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {sublabel}
      </Text>
    </View>
  );
}

// ─── Carb Progress Bar ────────────────────────────────────────────────────────

function CarbProgressBar({
  consumed,
  goal,
}: {
  consumed: number;
  goal: number;
}) {
  const pct = Math.min((consumed / goal) * 100, 100);
  const barColor = pct < 70 ? Colors.green : pct < 90 ? Colors.amber : Colors.error;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
      >
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary }}>
          Net Carbs
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}>
          {consumed}g / {goal}g
        </Text>
      </View>
      <View
        style={{
          height: 12,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 6,
          }}
        />
      </View>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: pct < 70 ? Colors.green : pct < 90 ? Colors.amber : Colors.error,
          marginTop: 6,
        }}
      >
        {goal - consumed > 0 ? `${goal - consumed}g remaining` : 'Goal reached!'}
      </Text>

      <View style={{ marginTop: 20 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
        >
          <Text
            style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textPrimary }}
          >
            Calories
          </Text>
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary }}
          >
            {mockCaloriesConsumed} / {mockCaloriesGoal}
          </Text>
        </View>
        <View
          style={{
            height: 12,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min((mockCaloriesConsumed / mockCaloriesGoal) * 100, 100)}%`,
              height: '100%',
              backgroundColor: Colors.green,
              borderRadius: 6,
            }}
          />
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: Colors.textSecondary,
            marginTop: 6,
          }}
        >
          {mockCaloriesGoal - mockCaloriesConsumed} kcal remaining
        </Text>
      </View>
    </View>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(withTiming(0.92, { duration: 80 }), withSpring(1));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={{ flex: 1 }}
      testID={`quick-action-${label.toLowerCase().replace(/\s/g, '-')}`}
    >
      <Animated.View
        style={[
          {
            backgroundColor: Colors.navyCard,
            borderRadius: BorderRadius.xl,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadows.card,
          },
          animStyle,
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: BorderRadius.md,
            backgroundColor: Colors.greenMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 12,
            color: Colors.textPrimary,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Weight Line Graph ────────────────────────────────────────────────────────

function WeightGraph({ data }: { data: number[] }) {
  const graphWidth = SCREEN_WIDTH - CARD_PADDING * 2 - 32;
  const graphHeight = 80;
  const min = Math.min(...data) - 1;
  const max = Math.max(...data) + 1;

  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * graphWidth,
    y: graphHeight - ((val - min) / (max - min)) * graphHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <View>
      <Svg width={graphWidth} height={graphHeight + 10}>
        <Path
          d={pathD}
          stroke={Colors.green}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === data.length - 1 ? 5 : 3}
            fill={i === data.length - 1 ? Colors.green : Colors.navyCard}
            stroke={Colors.green}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text
            key={i}
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 10,
              color: Colors.textTertiary,
              width: graphWidth / 7,
              textAlign: 'center',
            }}
          >
            {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({
  title,
  action,
  onAction,
  badge,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 16,
            color: Colors.textPrimary,
          }}
        >
          {title}
        </Text>
        {badge !== undefined && badge > 0 ? (
          <View
            style={{
              backgroundColor: Colors.error,
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 2,
              minWidth: 20,
              alignItems: 'center',
            }}
          >
            <Text
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: '#fff' }}
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction}>
          <Text
            style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.navyCard,
          borderRadius: BorderRadius.xl,
          padding: CARD_PADDING,
          borderWidth: 1,
          borderColor: Colors.border,
          ...Shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Greeting / Header ────────────────────────────────────────────────────────

function DashboardHeader({ name, streak }: { name: string; streak: number }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const pulseOpacity = useSharedValue(1);
  React.useEffect(() => {
    if (streak > 0) {
      pulseOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1,
        true
      );
    }
  }, [streak, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  return (
    <View style={{ paddingBottom: 20 }}>
      {/* Brand header row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        {/* Logo + Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(46,204,113,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(46,204,113,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChefHat size={17} color={Colors.green} />
          </View>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 20,
              color: Colors.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            PantryIQ
          </Text>
        </View>
        {/* Avatar */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.greenMuted,
            borderWidth: 2,
            borderColor: 'rgba(46,204,113,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 14,
              color: Colors.green,
            }}
          >
            {(name || 'U')[0].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Greeting row */}
      <View style={{ paddingHorizontal: CARD_PADDING, paddingTop: 4 }}>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 28,
            color: Colors.textPrimary,
            lineHeight: 36,
          }}
        >
          {greeting}, {name || 'there'}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.textSecondary }}
          >
            {dayName}, {dateStr}
          </Text>
          {streak > 0 ? (
            <Animated.View
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pulseStyle]}
            >
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 13,
                  color: Colors.amber,
                }}
              >
                {streak} day streak
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const userName = useAppStore((s) => s.userProfile.name);
  const streak = useAppStore((s) => s.streak.current);
  const carbGoal = useAppStore((s) => s.userProfile.dailyCarbGoal);
  const calGoal = useAppStore((s) => s.userProfile.dailyCalorieGoal);

  const [refreshing, setRefreshing] = React.useState(false);

  const calPct = Math.round((mockCaloriesConsumed / (calGoal || 1800)) * 100);
  const carbPct = Math.round((mockCarbsConsumed / (carbGoal || 50)) * 100);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  return (
    <LinearGradient
      colors={['#0A1628', '#0B1C35', '#0A1628']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} testID="dashboard-screen">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.green}
            />
          }
        >
          {/* Header */}
          <DashboardHeader name={userName} streak={streak} />

          {/* Daily Progress */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <Card>
              <SectionHeading title="Today's Progress" />
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
                <CircularProgress
                  percentage={calPct}
                  label={`${mockCaloriesConsumed} kcal`}
                  sublabel={`of ${calGoal || 1800} goal`}
                  color={Colors.green}
                />
                <View style={{ flex: 1, justifyContent: 'center', paddingTop: 4 }}>
                  <CarbProgressBar consumed={mockCarbsConsumed} goal={carbGoal || 50} />
                </View>
              </View>
            </Card>
          </View>

          {/* Quick Actions */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <SectionHeading title="Quick Actions" />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <QuickAction
                icon={<Scan size={22} color={Colors.green} />}
                label="Scan Item"
                onPress={() => router.push('/barcode-scanner')}
              />
              <QuickAction
                icon={<Plus size={22} color={Colors.green} />}
                label="Log Meal"
                onPress={() => router.push('/(tabs)/meals')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <QuickAction
                icon={<Activity size={22} color={Colors.green} />}
                label="Add Weight"
                onPress={() => router.push('/(tabs)/health')}
              />
              <QuickAction
                icon={<ChefHat size={22} color={Colors.green} />}
                label="Cook Something"
                onPress={() => router.push('/(tabs)/recipes')}
              />
            </View>
          </View>

          {/* Pantry Health Score */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 16,
                      color: Colors.textPrimary,
                      marginBottom: 4,
                    }}
                  >
                    Pantry Health
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textSecondary,
                    }}
                  >
                    12 items · 2 running low
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <CircularProgress
                    percentage={85}
                    size={80}
                    strokeWidth={8}
                    label=""
                    sublabel=""
                    color={Colors.green}
                  />
                  <Text
                    style={{
                      position: 'absolute',
                      top: 28,
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 16,
                      color: Colors.green,
                    }}
                  >
                    85%
                  </Text>
                </View>
              </View>
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: Colors.greenMuted,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: Colors.green,
                  }}
                >
                  Well Stocked — great job keeping it full!
                </Text>
              </View>
            </Card>
          </View>

          {/* Suggested Meals */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ paddingHorizontal: CARD_PADDING }}>
              <SectionHeading title="Suggested Meals" action="See All" onAction={() => {}} />
            </View>
            <FlatList
              horizontal
              data={mockMeals}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: CARD_PADDING, gap: 12 }}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  testID={`meal-card-${item.id}`}
                >
                  <View
                    style={{
                      width: 160,
                      height: 120,
                      borderRadius: BorderRadius.xl,
                      overflow: 'hidden',
                      ...Shadows.card,
                    }}
                  >
                    <LinearGradient
                      colors={[item.color, `${item.color}CC`]}
                      style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Utensils size={14} color="rgba(255,255,255,0.7)" />
                        <Text
                          style={{
                            fontFamily: 'DMSans_400Regular',
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {item.category}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={{
                            fontFamily: 'DMSans_700Bold',
                            fontSize: 13,
                            color: '#fff',
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'DMSans_400Regular',
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.7)',
                            marginTop: 2,
                          }}
                        >
                          {item.cal} kcal
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                </Pressable>
              )}
            />
          </View>

          {/* Low Stock Alerts */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <SectionHeading
              title="Low Stock"
              action="View All"
              onAction={() => {}}
              badge={mockLowStock.length}
            />
            <Card>
              {mockLowStock.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>✅</Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 14,
                      color: Colors.textSecondary,
                    }}
                  >
                    Everything's stocked up!
                  </Text>
                </View>
              ) : (
                mockLowStock.map((item, i) => (
                  <View
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 10,
                      borderBottomWidth: i < mockLowStock.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.borderLight,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: Colors.error,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 14,
                        color: Colors.textPrimary,
                        flex: 1,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 12,
                        color: Colors.error,
                      }}
                    >
                      {item.remaining} left
                    </Text>
                  </View>
                ))
              )}
            </Card>
          </View>

          {/* Recent Activity */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <SectionHeading title="Recent Activity" />
            <Card>
              {mockActivity.map((item, i) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth: i < mockActivity.length - 1 ? 1 : 0,
                    borderBottomColor: Colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: Colors.textPrimary,
                      flex: 1,
                    }}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 11,
                      color: Colors.textTertiary,
                    }}
                  >
                    {item.time}
                  </Text>
                </View>
              ))}
            </Card>
          </View>

          {/* Weight Trend */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <SectionHeading title="Weight This Week" />
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'PlayfairDisplay_700Bold',
                    fontSize: 28,
                    color: Colors.textPrimary,
                  }}
                >
                  {mockWeightData[mockWeightData.length - 1]} lbs
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TrendingDown size={14} color={Colors.green} />
                  <Text
                    style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.green }}
                  >
                    0.4 lbs this week
                  </Text>
                </View>
              </View>
              <WeightGraph data={mockWeightData} />
            </Card>
          </View>

          {/* Daily Tip */}
          <View style={{ paddingHorizontal: CARD_PADDING, marginBottom: 20 }}>
            <SectionHeading title="Daily Tip" />
            <Card
              style={{
                borderColor: Colors.green,
                borderWidth: 1,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: Colors.greenMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Apple size={18} color={Colors.green} />
                </View>
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 14,
                    color: Colors.textSecondary,
                    lineHeight: 22,
                    flex: 1,
                    fontStyle: 'italic',
                  }}
                >
                  "Eating whole foods with a low glycemic index helps stabilize blood sugar and
                  keeps you feeling full longer — a cornerstone of sustainable low-carb living."
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Chef Claude FAB */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/chef-claude');
          }}
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: Colors.green,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.green,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 100,
          }}
          testID="chef-claude-fab"
        >
          <ChefHat size={24} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

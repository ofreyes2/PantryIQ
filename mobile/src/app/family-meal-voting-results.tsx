import { View, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Flame, Users, Clock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import Animated, {
  FadeIn,
  SlideInUp,
  ZoomIn,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface MealOption {
  id: string;
  name: string;
  cookTime: number;
  crispiness: number;
  carbs: number;
  votes: number;
  emoji: string;
  winner?: boolean;
}

const MEAL_OPTIONS: MealOption[] = [
  {
    id: '1',
    name: 'Crispy Pork Rind Chicken Thighs',
    cookTime: 25,
    crispiness: 5,
    carbs: 2,
    votes: 0,
    emoji: '🍗',
    winner: true,
  },
  {
    id: '2',
    name: 'Beef Steak with Asparagus',
    cookTime: 20,
    crispiness: 4,
    carbs: 3,
    votes: 0,
    emoji: '🥩',
  },
  {
    id: '3',
    name: 'Salmon with Lemon Butter',
    cookTime: 15,
    crispiness: 3,
    carbs: 1,
    votes: 0,
    emoji: '🐟',
  },
];

interface FamilyMember {
  id: string;
  name: string;
  voted: boolean;
  avatar: string;
}

const FAMILY_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'You', voted: true, avatar: '👤' },
  { id: '2', name: 'Sarah', voted: true, avatar: '👩' },
  { id: '3', name: 'Tommy', voted: true, avatar: '👦' },
  { id: '4', name: 'Lisa', voted: true, avatar: '👧' },
];

function VoteBar({ option, totalVotes }: { option: MealOption; totalVotes: number }) {
  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withDelay(
      300 + parseInt(option.id) * 200,
      withSpring(percentage, { damping: 8, mass: 1.2 })
    );
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View className="mb-4">
      <View className="flex-row justify-between items-baseline mb-2">
        <Text className="text-gray-300 text-sm font-medium">{option.name}</Text>
        <Text className="text-blue-400 font-bold text-sm">
          {option.votes} votes
        </Text>
      </View>
      <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <Animated.View
          style={animatedStyle}
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
        />
      </View>
    </View>
  );
}

export default function FamilyMealVotingResults() {
  const router = useRouter();
  const [revealStage, setRevealStage] = useState<'initial' | 'voting' | 'winner'>('initial');
  const [mealsWithVotes, setMealsWithVotes] = useState<MealOption[]>([]);
  const confettiScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(1);

  useEffect(() => {
    // Simulate voting reveal
    setRevealStage('initial');

    const timer1 = setTimeout(() => {
      // Simulate vote counts coming in
      const votedMeals: MealOption[] = [
        { ...MEAL_OPTIONS[0], votes: 3 },
        { ...MEAL_OPTIONS[1], votes: 1 },
        { ...MEAL_OPTIONS[2], votes: 0 },
      ];
      setMealsWithVotes(votedMeals);
      setRevealStage('voting');
    }, 500);

    const timer2 = setTimeout(() => {
      setRevealStage('winner');
      confettiScale.value = withSequence(
        withSpring(1, { damping: 6, mass: 0.8 }),
        withDelay(2000, withSpring(0, { damping: 4 }))
      );
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const totalVotes = mealsWithVotes.reduce((sum, meal) => sum + meal.votes, 0);
  const winner = mealsWithVotes.find((m) => m.winner);

  const confettiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
    opacity: confettiOpacity.value,
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-6 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1 text-center">
          Tonight's Dinner Vote
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Voting Header */}
        <Animated.View entering={FadeIn.duration(400)} className="px-6 py-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Users size={18} color="#60a5fa" />
            <Text className="text-gray-400 text-sm">
              {FAMILY_MEMBERS.length} family members voted
            </Text>
          </View>

          {/* Family Avatars */}
          <View className="flex-row gap-2 mb-8">
            {FAMILY_MEMBERS.map((member) => (
              <Animated.View
                key={member.id}
                entering={SlideInUp.delay(parseInt(member.id) * 100)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-400/50 justify-center items-center"
              >
                <Text className="text-lg">{member.avatar}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Vote Results */}
        {revealStage !== 'initial' && (
          <Animated.View entering={SlideInUp.duration(600)} className="px-6 mb-8">
            <Text className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-4">
              Live Results
            </Text>

            {mealsWithVotes.map((option) => (
              <VoteBar key={option.id} option={option} totalVotes={totalVotes} />
            ))}
          </Animated.View>
        )}

        {/* Winner Reveal */}
        {revealStage === 'winner' && winner ? (
          <Animated.View entering={ZoomIn.springify().damping(6)} className="px-6 mb-12">
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(168, 85, 247, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl overflow-hidden border border-blue-400/50 p-8"
            >
              {/* Confetti Effect */}
              <Animated.View
                style={confettiAnimatedStyle}
                className="absolute inset-0 justify-center items-center"
                pointerEvents="none"
              >
                <Text className="text-6xl">🎉</Text>
              </Animated.View>

              {/* Winner Content */}
              <View className="items-center">
                <Text className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                  The Winner Is!
                </Text>

                <Text className="text-7xl mb-4">{winner.emoji}</Text>

                <Text className="text-2xl font-bold text-white text-center mb-3">
                  {winner.name}
                </Text>

                <View className="flex-row gap-2 justify-center mb-6 mt-2">
                  <View className="flex-row items-center gap-1 bg-red-500/20 rounded-full px-3 py-1 border border-red-400/50">
                    <Flame size={14} color="#ef4444" />
                    <Text className="text-red-400 text-xs font-semibold">
                      {winner.crispiness}/5
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1 bg-green-500/20 rounded-full px-3 py-1 border border-green-400/50">
                    <Text className="text-green-400 text-xs font-semibold">
                      {winner.carbs}g carbs
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1 bg-purple-500/20 rounded-full px-3 py-1 border border-purple-400/50">
                    <Clock size={14} color="#a78bfa" />
                    <Text className="text-purple-400 text-xs font-semibold">
                      {winner.cookTime}min
                    </Text>
                  </View>
                </View>

                {/* Vote Percentage */}
                <View className="bg-gray-800/50 rounded-xl px-4 py-3 mb-6">
                  <Text className="text-gray-300 text-xs text-center mb-1">
                    Won with
                  </Text>
                  <Text className="text-3xl font-bold text-center text-blue-400">
                    {totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0}%
                  </Text>
                  <Text className="text-gray-400 text-xs text-center mt-1">
                    of the vote
                  </Text>
                </View>

                {/* Chef Claude Message */}
                <View className="bg-amber-500/10 rounded-xl p-4 border border-amber-400/30 mb-6">
                  <Text className="text-amber-200 text-sm leading-5">
                    The family chose{' '}
                    <Text className="font-bold text-amber-100">
                      {winner.name}
                    </Text>
                    . I'll have the recipe ready when you are. Estimated cook time is{' '}
                    <Text className="font-bold">{winner.cookTime} minutes</Text> using your Instant Pot and air fryer lid.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        <View className="h-8" />
      </ScrollView>

      {/* Action Button */}
      {revealStage === 'winner' && (
        <Animated.View entering={SlideInUp.delay(400)} className="px-6 pb-8 pt-4 border-t border-gray-800">
          <TouchableOpacity className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl py-4 active:opacity-80 flex-row items-center justify-center gap-3">
            <Text className="text-white text-center font-semibold text-base">
              Start Cooking
            </Text>
            <Text className="text-xl">👨‍🍳</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { X, Utensils } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';
import { useMealsStore } from '@/lib/stores/mealsStore';
import { dateUtils } from '@/lib/dateUtils';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85;

interface MealsDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal?: (type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => void;
}

export function MealsDrawer({ visible, onClose, onSelectMeal }: MealsDrawerProps) {
  const [selectedDate, setSelectedDate] = useState(dateUtils.today());
  const getEntriesForDate = useMealsStore((s) => s.getEntriesForDate);

  const entries = getEntriesForDate(selectedDate);
  const breakfast = entries.filter((e) => e.mealType === 'Breakfast');
  const lunch = entries.filter((e) => e.mealType === 'Lunch');
  const dinner = entries.filter((e) => e.mealType === 'Dinner');
  const snacks = entries.filter((e) => e.mealType === 'Snacks');

  const translateX = useSharedValue(-DRAWER_WIDTH);

  React.useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -DRAWER_WIDTH, {
      duration: 300,
    });
  }, [visible, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleMealPress = (mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks') => {
    onSelectMeal?.(mealType);
    onClose();
  };

  const mealConfig = {
    Breakfast: { icon: '🌅', color: '#F39C12' },
    Lunch: { icon: '🌞', color: '#E67E22' },
    Dinner: { icon: '🌙', color: '#9B59B6' },
    Snacks: { icon: '🍎', color: '#2ECC71' },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onClose}
      >
        {/* Drawer */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: DRAWER_WIDTH,
              backgroundColor: Colors.navy,
              borderRightWidth: 1,
              borderRightColor: Colors.border,
              ...Shadows.card,
            },
            animatedStyle,
          ]}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Utensils size={24} color={Colors.green} />
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 18,
                    color: Colors.textPrimary,
                  }}
                >
                  Meals
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Date Info */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 13,
                  color: Colors.green,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {dateUtils.displayLabel(selectedDate)}
              </Text>
            </View>

            {/* Meals List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 12 }}
            >
              {/* Breakfast */}
              <MealSection
                icon={mealConfig.Breakfast.icon}
                title="Breakfast"
                count={breakfast.length}
                color={mealConfig.Breakfast.color}
                onPress={() => handleMealPress('Breakfast')}
              />

              {/* Lunch */}
              <MealSection
                icon={mealConfig.Lunch.icon}
                title="Lunch"
                count={lunch.length}
                color={mealConfig.Lunch.color}
                onPress={() => handleMealPress('Lunch')}
              />

              {/* Dinner */}
              <MealSection
                icon={mealConfig.Dinner.icon}
                title="Dinner"
                count={dinner.length}
                color={mealConfig.Dinner.color}
                onPress={() => handleMealPress('Dinner')}
              />

              {/* Snacks */}
              <MealSection
                icon={mealConfig.Snacks.icon}
                title="Snacks"
                count={snacks.length}
                color={mealConfig.Snacks.color}
                onPress={() => handleMealPress('Snacks')}
              />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function MealSection({
  icon,
  title,
  count,
  color,
  onPress,
}: {
  icon: string;
  title: string;
  count: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 8,
        marginBottom: 8,
        backgroundColor: pressed ? Colors.surface : Colors.navyCard,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 15,
            color: Colors.textPrimary,
          }}
        >
          {title}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: color + '20',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: BorderRadius.sm,
        }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 12,
            color: color,
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

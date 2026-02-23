/**
 * New Day Greeting Card
 * Shows briefly on app open when a new day is detected
 * Displays yesterday's summary and today's goals for continuity
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useNutritionStore } from '@/lib/stores/nutritionStore';
import { dateUtils } from '@/lib/dateUtils';
import { Colors } from '@/constants/theme';

interface NewDayGreetingProps {
  userName: string;
  yesterdayTotals?: {
    calories: number;
    netCarbs: number;
    protein: number;
    fat: number;
  };
  onDismiss: () => void;
}

export const NewDayGreeting: React.FC<NewDayGreetingProps> = ({
  userName,
  yesterdayTotals,
  onDismiss,
}) => {
  const macroGoals = useNutritionStore((s) => s.macroGoals);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = new Animated.Value(1);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onDismiss();
    });
  };

  if (dismissed) return null;

  const timeOfDay = dateUtils.timeOfDay();
  const greeting =
    timeOfDay === 'morning'
      ? '🌅 Good Morning'
      : timeOfDay === 'afternoon'
        ? '☀️ Good Afternoon'
        : '🌙 Good Evening';

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: 16,
          padding: 24,
          marginHorizontal: 20,
          width: '90%',
          maxWidth: 340,
          borderWidth: 1,
          borderColor: Colors.green,
          shadowColor: Colors.green,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Greeting Header */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: '600',
            color: Colors.textPrimary,
            marginBottom: 4,
            fontFamily: 'DMSans_600SemiBold',
          }}
        >
          {greeting}, {userName}!
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            marginBottom: 20,
            fontFamily: 'DMSans_400Regular',
          }}
        >
          New day, fresh start.
        </Text>

        {/* Yesterday Summary */}
        {yesterdayTotals ? (
          <View
            style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
              borderLeftWidth: 3,
              borderLeftColor: Colors.green,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginBottom: 8,
                fontFamily: 'DMSans_400Regular',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Yesterday's Summary
            </Text>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textPrimary,
                  fontFamily: 'DMSans_500Medium',
                }}
              >
                {yesterdayTotals.calories} cal
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.green,
                  fontFamily: 'DMSans_500Medium',
                }}
              >
                {yesterdayTotals.netCarbs}g net carbs
              </Text>
            </View>
          </View>
        ) : null}

        {/* Today's Goals */}
        <Text
          style={{
            fontSize: 12,
            color: Colors.textSecondary,
            marginBottom: 12,
            fontFamily: 'DMSans_400Regular',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Today's Goals
        </Text>

        <View
          style={{
            gap: 8,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: Colors.textPrimary,
                fontFamily: 'DMSans_400Regular',
              }}
            >
              🥩 Calories
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: Colors.green,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              {macroGoals?.dailyCalories || 1800}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: Colors.textPrimary,
                fontFamily: 'DMSans_400Regular',
              }}
            >
              🥦 Net Carbs
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: Colors.green,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              {macroGoals?.dailyCarbsNet || 20}g
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: Colors.textPrimary,
                fontFamily: 'DMSans_400Regular',
              }}
            >
              💧 Water
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: Colors.green,
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              80oz
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => ({
            backgroundColor: Colors.green,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: Colors.navy,
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Let's Go
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

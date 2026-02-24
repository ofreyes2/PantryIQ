import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable } from 'react-native';
import { Home, UtensilsCrossed, Utensils, ChefHat, ShoppingCart, Heart, Settings } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { MealsDrawer } from '@/components/MealsDrawer';

export default function TabLayout() {
  const [mealsDrawerVisible, setMealsDrawerVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.green,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarStyle: {
            backgroundColor: Colors.navy,
            borderTopColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 1,
            height: 84,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'DMSans_400Regular',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="pantry"
          options={{
            title: 'Pantry',
            tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="meals"
          options={{
            title: 'Meals',
            tabBarButton: (props) => (
              <Pressable
                {...props}
                onPress={() => setMealsDrawerVisible(true)}
              >
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Utensils size={22} color={Colors.textTertiary} />
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: ({ color }) => <ChefHat size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: 'Shopping',
            tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="health"
          options={{
            title: 'Health',
            tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
          }}
        />
      </Tabs>

      <MealsDrawer visible={mealsDrawerVisible} onClose={() => setMealsDrawerVisible(false)} />
    </>
  );
}

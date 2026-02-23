import React, { useCallback } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import {
  Home,
  UtensilsCrossed,
  Utensils,
  ChefHat,
  ShoppingCart,
  Heart,
  Settings,
} from 'lucide-react-native';
import {
  Pressable,
  View,
  LayoutChangeEvent,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/constants/theme';

const CustomTabBar = ({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) => {
  const router = useRouter();
  const segments = useSegments();

  // Get the current tab name from segments
  const currentTab = (segments as string[])?.[1] || 'index';

  const handleChefPress = useCallback(() => {
    router.push('/chef-claude');
  }, [router]);

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: Colors.navy,
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            testID={`tab-${route.name}`}
          >
            {options.tabBarIcon
              ? options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? Colors.green : Colors.textTertiary,
                  size: 22,
                })
              : null}
          </Pressable>
        );
      })}

      {/* Chef button - hide on health tab */}
      {currentTab !== 'health' ? (
        <Pressable
          onPress={handleChefPress}
          style={styles.chefButton}
          testID="chef-button"
        >
          <ChefHat size={22} color={Colors.green} />
        </Pressable>
      ) : (
        <></>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 84,
    paddingBottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chefButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
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
          tabBarIcon: ({ color }) => <Utensils size={22} color={color} />,
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
  );
}

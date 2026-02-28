import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { useAppStore, hydrateAppStore } from '@/lib/stores/appStore';
import { hydratePantryStore } from '@/lib/stores/pantryStore';
import { hydrateMealsStore } from '@/lib/stores/mealsStore';
import { hydrateLocationStore } from '@/lib/stores/locationStore';
import { hydrateHealthStore } from '@/lib/stores/healthStore';
import { hydrateShoppingStore } from '@/lib/stores/shoppingStore';
import { hydrateRecipesStore } from '@/lib/stores/recipesStore';
import { hydrateKitchenStore } from '@/lib/stores/kitchenStore';
import { hydrateKitchenMapStore } from '@/lib/stores/kitchenMapStore';
import { hydrateChefConversationStore } from '@/lib/stores/chefConversationStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { checkAndHandleDailyReset } from '@/lib/dailyReset';
import { NewDayGreeting } from '@/components/NewDayGreeting';
import { MealLogger } from '@/lib/mealLogger';
import { dateUtils } from '@/lib/dateUtils';
import { runDiagnosticsAndRepair } from '@/lib/selfRepair';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const userName = useAppStore((s) => s.userProfile.name);
  const router = useRouter();
  const segments = useSegments();
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingData, setGreetingData] = useState<any>(null);

  // Handle daily reset on app focus (background to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAndHandleDailyReset().then((result) => {
          if (result.showGreeting && onboardingComplete) {
            setGreetingData(result);
            setShowGreeting(true);
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onboardingComplete]);

  // Initial daily reset check on mount
  useEffect(() => {
    checkAndHandleDailyReset().then((result) => {
      if (result.showGreeting && onboardingComplete) {
        setGreetingData(result);
        setShowGreeting(true);
      }
    });
  }, [onboardingComplete]);

  // Run duplicate cleanup on app load
  useEffect(() => {
    const cleanup = async () => {
      try {
        const today = dateUtils.today();
        const yesterday = dateUtils.yesterday();
        await MealLogger.cleanupDuplicatesForDate(today);
        await MealLogger.cleanupDuplicatesForDate(yesterday);
        console.log('[DailyReset] Cleaned duplicates for today and yesterday');
      } catch (error) {
        console.error('[DailyReset] Error cleaning duplicates:', error);
      }
    };
    cleanup();
  }, []);

  useEffect(() => {
    const inOnboarding = (segments as string[])[0] === 'onboarding';

    if (!onboardingComplete && !inOnboarding) {
      router.replace('/onboarding' as never);
    } else if (onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [onboardingComplete, segments, router]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-pantry-item" options={{ headerShown: false }} />
        <Stack.Screen name="barcode-scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="pantry-item-detail" options={{ headerShown: false }} />
        <Stack.Screen name="add-meal-entry" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
        <Stack.Screen name="generate-recipe" options={{ headerShown: false }} />
        <Stack.Screen name="import-recipe" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-box" options={{ headerShown: false }} />
        <Stack.Screen name="shopping-history" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="photo-recognition" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="kitchen-locations" options={{ headerShown: false }} />
        <Stack.Screen name="kitchen-map" options={{ headerShown: false }} />
        <Stack.Screen name="kitchen-photo-session" options={{ headerShown: false }} />
        <Stack.Screen name="zone-map" options={{ headerShown: false }} />
        <Stack.Screen name="api-status" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="chef-claude" options={{ headerShown: false }} />
        <Stack.Screen name="chef-claude-history" options={{ headerShown: false }} />
        <Stack.Screen name="kitchen-equipment" options={{ headerShown: false }} />
        <Stack.Screen name="fasting-timer" options={{ headerShown: false }} />
        <Stack.Screen name="macro-calculator" options={{ headerShown: false }} />
        <Stack.Screen name="meal-type-detail" options={{ headerShown: false }} />
      </Stack>
      {showGreeting ? (
        <NewDayGreeting
          userName={userName}
          yesterdayTotals={greetingData?.yesterdayTotals}
          onDismiss={() => setShowGreeting(false)}
        />
      ) : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      // Hydrate all Zustand stores from AsyncStorage
      await Promise.all([
        hydrateAppStore(),
        hydratePantryStore(),
        hydrateMealsStore(),
        hydrateLocationStore(),
        hydrateHealthStore(),
        hydrateShoppingStore(),
        hydrateRecipesStore(),
        hydrateKitchenStore(),
        hydrateKitchenMapStore(),
        hydrateChefConversationStore(),
      ]);

      // Run diagnostics and auto-repair in background
      runDiagnosticsAndRepair().catch((error) => {
        console.error('[AppInitialization] Diagnostics error:', error);
      });

      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <KeyboardProvider>
          <ErrorBoundary>
            <StatusBar style="light" />
            <RootLayoutNav />
          </ErrorBoundary>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

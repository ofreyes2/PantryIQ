import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateUtils } from './dateUtils';

export interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  fix?: string;
}

export interface DiagnosticsReport {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'ISSUES_FOUND' | 'CRITICAL';
  results: DiagnosticResult[];
  repairableCount: number;
}

export const runDiagnostics = async (): Promise<DiagnosticsReport> => {
  const results: DiagnosticResult[] = [];
  const today = dateUtils.today();
  const yesterday = dateUtils.yesterday();

  // ── CHECK 1 — Meal Storage Keys ──────────────
  const newFormatKey = `pantryiq_daily_log_${today}`;
  const oldFormatKey = `pantryiq_meal_log_${today}`;

  const newFormatData = await AsyncStorage.getItem(newFormatKey);
  const oldFormatData = await AsyncStorage.getItem(oldFormatKey);

  if (newFormatData) {
    results.push({
      name: 'Meal Storage Format',
      status: 'PASS',
      message: `Meals correctly stored in ${newFormatKey}`,
    });
  } else if (oldFormatData) {
    results.push({
      name: 'Meal Storage Format',
      status: 'FAIL',
      message: `Meals found in OLD key ${oldFormatKey} — not in new format`,
      fix: 'migrate_meal_keys',
    });
  } else {
    results.push({
      name: 'Meal Storage Format',
      status: 'WARN',
      message: 'No meals logged today — cannot verify key format',
    });
  }

  // ── CHECK 2 — Streak Key Format ──────────────
  const streakRaw = await AsyncStorage.getItem('pantryiq_streak_data');
  const streak = streakRaw ? JSON.parse(streakRaw) : null;

  if (!streak) {
    results.push({
      name: 'Streak Data',
      status: 'WARN',
      message: 'No streak data found — will initialize on next meal log',
      fix: 'init_streak',
    });
  } else if (streak.currentStreak === 0 && newFormatData) {
    results.push({
      name: 'Streak Data',
      status: 'FAIL',
      message: 'Streak is 0 but meals exist today — key mismatch likely',
      fix: 'recalculate_streak',
    });
  } else {
    results.push({
      name: 'Streak Data',
      status: 'PASS',
      message: `Streak data valid — current streak: ${streak.currentStreak} days`,
    });
  }

  // ── CHECK 3 — Zustand Sync ───────────────────
  try {
    const zustandRaw = await AsyncStorage.getItem('pantryiq-meals-store');
    const zustand = zustandRaw ? JSON.parse(zustandRaw) : null;

    if (!zustand) {
      results.push({
        name: 'Zustand Meals Store',
        status: 'WARN',
        message: 'Zustand meals store empty',
        fix: 'sync_zustand',
      });
    } else {
      const zustandEntries = zustand?.state?.entries?.[today] || [];
      const directEntries = newFormatData ? JSON.parse(newFormatData) : [];
      const directCount = [
        ...(directEntries.breakfast || []),
        ...(directEntries.lunch || []),
        ...(directEntries.dinner || []),
        ...(directEntries.snacks || []),
      ].length;
      const zustandCount = zustandEntries.length;

      if (directCount > 0 && zustandCount === 0) {
        results.push({
          name: 'Zustand Sync',
          status: 'FAIL',
          message: `AsyncStorage has ${directCount} meals but Zustand has 0 — out of sync`,
          fix: 'sync_zustand',
        });
      } else {
        results.push({
          name: 'Zustand Sync',
          status: 'PASS',
          message: `Zustand and AsyncStorage in sync — ${zustandCount} entries`,
        });
      }
    }
  } catch (e) {
    results.push({
      name: 'Zustand Sync',
      status: 'FAIL',
      message: `Could not parse Zustand store: ${e instanceof Error ? e.message : 'Unknown error'}`,
      fix: 'sync_zustand',
    });
  }

  // ── CHECK 4 — Date Format Sanity ─────────────
  const localToday = dateUtils.today();
  const utcToday = new Date().toISOString().split('T')[0];

  if (localToday !== utcToday) {
    results.push({
      name: 'Date Format',
      status: 'WARN',
      message: `Local date ${localToday} differs from UTC ${utcToday} — UTC bug would affect this app right now`,
    });
  } else {
    results.push({
      name: 'Date Format',
      status: 'PASS',
      message: `Local and UTC dates match: ${localToday}`,
    });
  }

  // ── CHECK 5 — Yesterday Meals Readable ───────
  const yesterdayKey = `pantryiq_daily_log_${yesterday}`;
  const yesterdayData = await AsyncStorage.getItem(yesterdayKey);

  if (yesterdayData) {
    const parsed = JSON.parse(yesterdayData);
    const count = [
      ...(parsed.breakfast || []),
      ...(parsed.lunch || []),
      ...(parsed.dinner || []),
      ...(parsed.snacks || []),
    ].length;
    results.push({
      name: 'Yesterday Meals',
      status: 'PASS',
      message: `Yesterday (${yesterday}) has ${count} logged meals — readable`,
    });
  } else {
    results.push({
      name: 'Yesterday Meals',
      status: 'WARN',
      message: `No meals found for yesterday (${yesterday})`,
    });
  }

  // ── CHECK 6 — Chef Claude Context ────────────
  try {
    const { ChefClaudeTools } = await import('./chefClaudeTools');
    const summary = await ChefClaudeTools.getDailySummary();
    if (summary) {
      results.push({
        name: 'Chef Claude Tools',
        status: 'PASS',
        message: 'getDailySummary works and returns data',
      });
    } else {
      results.push({
        name: 'Chef Claude Tools',
        status: 'WARN',
        message: 'getDailySummary returned empty — no data yet today',
      });
    }
  } catch (e) {
    results.push({
      name: 'Chef Claude Tools',
      status: 'FAIL',
      message: `chefClaudeTools import failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
      fix: 'check_tools_import',
    });
  }

  // ── CHECK 7 — API Key Present ─────────────────
  const apiKey =
    (await AsyncStorage.getItem('pantryiq_anthropic_key')) ||
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (apiKey && apiKey.startsWith('sk-ant')) {
    results.push({
      name: 'Anthropic API Key',
      status: 'PASS',
      message: 'API key present and correctly formatted',
    });
  } else {
    results.push({
      name: 'Anthropic API Key',
      status: 'FAIL',
      message: 'Anthropic API key missing or malformed',
      fix: 'check_api_key',
    });
  }

  // ── CHECK 8 — Pantry Data ────────────────────
  const pantryRaw = await AsyncStorage.getItem('pantryiq-pantry-store');
  const pantry = pantryRaw ? JSON.parse(pantryRaw) : null;
  const pantryItems = pantry?.state?.items || [];

  results.push({
    name: 'Pantry Data',
    status: pantryItems.length > 0 ? 'PASS' : 'WARN',
    message: `Pantry has ${pantryItems.length} items`,
  });

  // ── CHECK 9 — Shopping List ──────────────────
  const shoppingRaw = await AsyncStorage.getItem('pantryiq-shopping-store');
  const shopping = shoppingRaw ? JSON.parse(shoppingRaw) : null;
  const shoppingItems = shopping?.state?.items || [];

  results.push({
    name: 'Shopping List',
    status: 'PASS',
    message: `Shopping list has ${shoppingItems.length} items`,
  });

  // ── CHECK 10 — User Profile ──────────────────
  const appStoreRaw = await AsyncStorage.getItem('pantryiq-app-store');
  const appStore = appStoreRaw ? JSON.parse(appStoreRaw) : null;
  const profile = appStore?.state?.userProfile;

  if (profile?.name) {
    results.push({
      name: 'User Profile',
      status: 'PASS',
      message: `Profile loaded — user: ${profile.name}`,
    });
  } else {
    results.push({
      name: 'User Profile',
      status: 'WARN',
      message: 'User profile missing or incomplete',
    });
  }

  // ── CALCULATE OVERALL STATUS ──────────────────
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const repairableCount = results.filter((r) => r.fix).length;

  const overallStatus =
    failCount > 0 ? 'CRITICAL' : warnCount > 0 ? 'ISSUES_FOUND' : 'HEALTHY';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    results,
    repairableCount,
  };
};

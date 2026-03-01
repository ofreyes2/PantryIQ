import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateUtils } from './dateUtils';
import { ChefClaudeTools } from './chefClaudeTools';

export const runSelfRepair = async (fixes: string[]): Promise<string[]> => {
  const repaired: string[] = [];

  for (const fix of fixes) {
    try {
      switch (fix) {
        case 'migrate_meal_keys': {
          // Move data from old key format to new format
          const today = dateUtils.today();
          const oldKey = `pantryiq_meal_log_${today}`;
          const newKey = `pantryiq_daily_log_${today}`;

          const oldData = await AsyncStorage.getItem(oldKey);
          if (oldData) {
            await AsyncStorage.setItem(newKey, oldData);
            await AsyncStorage.removeItem(oldKey);
            console.log('[SelfRepair] Migrated meals from old key to new format');
            repaired.push('migrate_meal_keys');
          }
          break;
        }

        case 'init_streak': {
          // Initialize streak data if missing
          const streakData = {
            currentStreak: 0,
            longestStreak: 0,
            lastLoggedDate: null,
          };
          await AsyncStorage.setItem(
            'pantryiq_streak_data',
            JSON.stringify(streakData)
          );
          console.log('[SelfRepair] Initialized streak data');
          repaired.push('init_streak');
          break;
        }

        case 'recalculate_streak': {
          // Recalculate streak based on meal logs
          const today = dateUtils.today();
          const todayKey = `pantryiq_daily_log_${today}`;
          const todayData = await AsyncStorage.getItem(todayKey);

          if (todayData) {
            const parsed = JSON.parse(todayData);
            const mealCount = [
              ...(parsed.breakfast || []),
              ...(parsed.lunch || []),
              ...(parsed.dinner || []),
              ...(parsed.snacks || []),
            ].length;

            if (mealCount > 0) {
              const streakData = {
                currentStreak: 1,
                longestStreak: 1,
                lastLoggedDate: today,
              };
              await AsyncStorage.setItem(
                'pantryiq_streak_data',
                JSON.stringify(streakData)
              );
              console.log('[SelfRepair] Recalculated streak');
              repaired.push('recalculate_streak');
            }
          }
          break;
        }

        case 'sync_zustand': {
          // Sync Zustand store with AsyncStorage
          const today = dateUtils.today();
          const key = `pantryiq_daily_log_${today}`;
          const data = await AsyncStorage.getItem(key);

          if (data) {
            const parsed = JSON.parse(data);
            const entries = [
              ...(parsed.breakfast || []),
              ...(parsed.lunch || []),
              ...(parsed.dinner || []),
              ...(parsed.snacks || []),
            ];

            const zustandData = {
              state: {
                entries: {
                  [today]: entries,
                },
              },
            };

            await AsyncStorage.setItem(
              'pantryiq-meals-store',
              JSON.stringify(zustandData)
            );
            console.log('[SelfRepair] Synced Zustand store with AsyncStorage');
            repaired.push('sync_zustand');
          }
          break;
        }

        case 'check_tools_import': {
          // Verify Chef Claude tools are accessible
          try {
            const summary = await ChefClaudeTools.getDailySummary();
            if (summary) {
              console.log('[SelfRepair] Chef Claude tools verified');
              repaired.push('check_tools_import');
            }
          } catch (e) {
            console.error('[SelfRepair] Could not verify tools:', e);
          }
          break;
        }

        case 'check_api_key': {
          // Check for API key in environment
          const apiKey =
            (await AsyncStorage.getItem('pantryiq_anthropic_key')) ||
            process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

          if (apiKey && apiKey.startsWith('sk-ant')) {
            console.log('[SelfRepair] API key verified');
            repaired.push('check_api_key');
          } else {
            console.warn(
              '[SelfRepair] API key not found or invalid — manual setup required'
            );
          }
          break;
        }

        default:
          console.warn(`[SelfRepair] Unknown fix: ${fix}`);
      }
    } catch (error) {
      console.error(
        `[SelfRepair] Error applying fix ${fix}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  return repaired;
};

/**
 * Run full diagnostics and auto-repair cycle
 * Returns summary of issues found and fixed
 */
export const runDiagnosticsAndRepair = async () => {
  try {
    const { runDiagnostics } = await import('./diagnostics');
    const report = await runDiagnostics();

    console.log('[DiagnosticsAndRepair] Report:', report);

    // Get all fixable issues
    const fixableIssues = report.results
      .filter((r) => r.fix)
      .map((r) => r.fix as string);

    if (fixableIssues.length > 0) {
      console.log('[DiagnosticsAndRepair] Attempting auto-repair...');
      const repaired = await runSelfRepair(fixableIssues);
      console.log('[DiagnosticsAndRepair] Repaired:', repaired);

      return {
        report,
        repaired,
        successCount: repaired.length,
        failureCount: fixableIssues.length - repaired.length,
      };
    }

    return {
      report,
      repaired: [],
      successCount: 0,
      failureCount: 0,
    };
  } catch (_error) {
    // Silently swallow errors — diagnostics should never crash the app
    return {
      report: null,
      repaired: [],
      successCount: 0,
      failureCount: 0,
      error: _error instanceof Error ? _error.message : 'Unknown error',
    };
  }
};

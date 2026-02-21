import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRecipesStore } from '@/lib/stores/recipesStore';
import { usePantryStore } from '@/lib/stores/pantryStore';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export default function GenerateRecipeScreen() {
  const router = useRouter();
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const pantryItems = usePantryStore((s) => s.items);
  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);

  const [prompt, setPrompt] = useState('');
  const [usePantry, setUsePantry] = useState(true);
  const [excludedIngredients, setExcludedIngredients] = useState<Set<string>>(new Set());
  const [servings, setServings] = useState(2);
  const [maxCarbs, setMaxCarbs] = useState('20');
  const [maxTime, setMaxTime] = useState('30');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Any'>('Any');
  const [loading, setLoading] = useState(false);

  const toggleIngredient = (name: string) => {
    setExcludedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Missing Info', 'Please describe what you would like to cook.');
      return;
    }
    if (!claudeApiKey) {
      Alert.alert(
        'API Key Required',
        'Please add your Claude API key in Settings to use this feature.'
      );
      return;
    }

    setLoading(true);

    const includedItems = usePantry
      ? pantryItems
          .filter((p) => !excludedIngredients.has(p.name))
          .map((p) => `${p.name} (${p.quantity} ${p.unit})`)
          .join(', ')
      : '';

    const userMessage = [
      prompt,
      includedItems ? `Available pantry items: ${includedItems}` : '',
      `Servings: ${servings}`,
      maxCarbs ? `Max net carbs per serving: ${maxCarbs}g` : '',
      maxTime ? `Max total cook time: ${maxTime} minutes` : '',
      difficulty !== 'Any' ? `Difficulty preference: ${difficulty}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const systemPrompt =
      'You are a keto/low-carb recipe expert. Always respond with a valid JSON object (no markdown, no explanation outside the JSON) matching this exact structure: { "title": string, "description": string, "prepTime": number, "cookTime": number, "servings": number, "difficulty": number (1-5), "netCarbsPerServing": number, "caloriesPerServing": number, "proteinPerServing": number, "fatPerServing": number, "category": string, "tags": string[], "ingredients": [{"name": string, "quantity": string, "unit": string}], "instructions": string[], "notes": string }';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'API error');
      }

      const text: string = data?.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse recipe JSON');

      const parsed = JSON.parse(jsonMatch[0]);

      addRecipe({
        ...parsed,
        isFavorite: false,
        isUserCreated: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Generation Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="generate-recipe-screen">
      {loading ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(10,22,40,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          } as never}
        >
          <LinearGradient
            colors={[Colors.navyCard, Colors.surface]}
            style={{
              borderRadius: BorderRadius.xl,
              padding: 40,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              minWidth: 240,
            }}
          >
            <ActivityIndicator size="large" color={Colors.green} />
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 16,
                color: Colors.textPrimary,
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              Claude is crafting your recipe...
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.textSecondary,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              This usually takes 10-20 seconds
            </Text>
          </LinearGradient>
        </View>
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: 14,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: BorderRadius.full,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
            testID="back-button"
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>
          <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: Colors.textPrimary }}>
            Generate Recipe
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}
        >
          {/* Main prompt */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginBottom: 8 }}
            >
              What would you like to cook?
            </Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder="e.g. A quick keto dinner using chicken and vegetables..."
              placeholderTextColor={Colors.textTertiary}
              style={{
                backgroundColor: Colors.navyCard,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: Colors.textPrimary,
                minHeight: 100,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: Colors.border,
                lineHeight: 22,
              }}
              testID="recipe-prompt-input"
            />
          </View>

          {/* Use pantry toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.textPrimary }}>
                Use pantry ingredients
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
                Include your current pantry items in the prompt
              </Text>
            </View>
            <Switch
              value={usePantry}
              onValueChange={setUsePantry}
              trackColor={{ false: Colors.surface, true: Colors.green }}
              thumbColor={Colors.textPrimary}
              testID="use-pantry-toggle"
            />
          </View>

          {/* Pantry ingredient pills */}
          {usePantry && pantryItems.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 }}
              >
                Tap to exclude from recipe:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {pantryItems.map((item) => {
                  const excluded = excludedIngredients.has(item.name);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleIngredient(item.name)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.full,
                        backgroundColor: excluded ? Colors.surface : Colors.greenMuted,
                        borderWidth: 1,
                        borderColor: excluded ? Colors.border : 'rgba(46,204,113,0.3)',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_500Medium',
                          fontSize: 12,
                          color: excluded ? Colors.textTertiary : Colors.green,
                          textDecorationLine: excluded ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Preferences */}
          <Text
            style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.textPrimary, marginBottom: 14 }}
          >
            Preferences
          </Text>

          {/* Servings */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary, marginBottom: 10 }}>
              Servings
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable
                onPress={() => setServings((s) => Math.max(1, s - 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <ChevronDown size={18} color={Colors.textSecondary} />
              </Pressable>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 20, color: Colors.textPrimary, minWidth: 28, textAlign: 'center' }}>
                {servings}
              </Text>
              <Pressable
                onPress={() => setServings((s) => Math.min(8, s + 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: BorderRadius.full,
                  backgroundColor: Colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <ChevronUp size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Max carbs */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
                Max net carbs per serving
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput
                value={maxCarbs}
                onChangeText={setMaxCarbs}
                keyboardType="number-pad"
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  width: 60,
                  textAlign: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                testID="max-carbs-input"
              />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>g</Text>
            </View>
          </View>

          {/* Max cook time */}
          <View
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 20,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.textSecondary }}>
                Max total cook time
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput
                value={maxTime}
                onChangeText={setMaxTime}
                keyboardType="number-pad"
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: BorderRadius.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 15,
                  color: Colors.textPrimary,
                  width: 60,
                  textAlign: 'center',
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                testID="max-time-input"
              />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.textSecondary }}>min</Text>
            </View>
          </View>

          {/* Difficulty chips */}
          <Text
            style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.textSecondary, marginBottom: 10 }}
          >
            Difficulty
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
            {(['Easy', 'Medium', 'Any'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: BorderRadius.md,
                  backgroundColor: difficulty === d ? Colors.green : Colors.surface,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: difficulty === d ? Colors.green : Colors.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 13,
                    color: difficulty === d ? Colors.navy : Colors.textSecondary,
                  }}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Generate button */}
          <Pressable
            onPress={handleGenerate}
            style={{
              backgroundColor: Colors.green,
              borderRadius: BorderRadius.lg,
              padding: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              shadowColor: Colors.green,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            }}
            testID="generate-button"
          >
            <Sparkles size={20} color={Colors.navy} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
              Generate Recipe
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

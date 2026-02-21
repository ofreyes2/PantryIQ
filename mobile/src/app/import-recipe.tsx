import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Link } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useRecipesStore } from '@/lib/stores/recipesStore';
import { useAppStore } from '@/lib/stores/appStore';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const addRecipe = useRecipesStore((s) => s.addRecipe);
  const claudeApiKey = useAppStore((s) => s.userProfile.claudeApiKey);

  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const content = url.trim() || rawText.trim();
    if (!content) {
      Alert.alert('Nothing to Import', 'Please enter a recipe URL or paste recipe text.');
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

    const userMessage = `Extract this recipe and return a JSON object with this exact structure: { "title": string, "description": string, "prepTime": number, "cookTime": number, "servings": number, "difficulty": number (1-5), "netCarbsPerServing": number, "caloriesPerServing": number, "proteinPerServing": number, "fatPerServing": number, "category": string, "tags": string[], "ingredients": [{"name": string, "quantity": string, "unit": string}], "instructions": string[], "notes": string }. If a URL is provided, use the URL as context. Recipe content:\n\n${content}`;

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
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? 'API error');
      }

      const text: string = data?.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse recipe JSON from response');

      const parsed = JSON.parse(jsonMatch[0]);

      addRecipe({
        ...parsed,
        isFavorite: false,
        isUserCreated: true,
        sourceUrl: url.trim() || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Import Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.navy }} testID="import-recipe-screen">
      {loading ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10,22,40,0.92)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
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
              Importing your recipe...
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
              Claude is extracting the details
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
            Import Recipe
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 40 }}
        >
          {/* Info card */}
          <View
            style={{
              backgroundColor: Colors.greenMuted,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderWidth: 1,
              borderColor: 'rgba(46,204,113,0.25)',
            }}
          >
            <Link size={20} color={Colors.green} />
            <Text
              style={{
                flex: 1,
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 18,
              }}
            >
              Paste a recipe URL or the full recipe text. Claude will extract the ingredients and steps automatically.
            </Text>
          </View>

          {/* URL input */}
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 14,
              color: Colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Paste recipe URL
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://www.allrecipes.com/recipe/..."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: Colors.border,
              marginBottom: 24,
            }}
            testID="url-input"
          />

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 13,
                color: Colors.textTertiary,
                marginHorizontal: 14,
              }}
            >
              OR
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          </View>

          {/* Text paste */}
          <Text
            style={{
              fontFamily: 'DMSans_700Bold',
              fontSize: 14,
              color: Colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Paste recipe text
          </Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            multiline
            placeholder="Paste the full recipe text here — ingredients, instructions, everything..."
            placeholderTextColor={Colors.textTertiary}
            style={{
              backgroundColor: Colors.navyCard,
              borderRadius: BorderRadius.md,
              padding: Spacing.md,
              fontFamily: 'DMSans_400Regular',
              fontSize: 14,
              color: Colors.textPrimary,
              minHeight: 160,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: Colors.border,
              lineHeight: 20,
              marginBottom: 32,
            }}
            testID="text-input"
          />

          {/* Import button */}
          <Pressable
            onPress={handleImport}
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
            testID="import-button"
          >
            <Link size={20} color={Colors.navy} />
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.navy }}>
              Import Recipe
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

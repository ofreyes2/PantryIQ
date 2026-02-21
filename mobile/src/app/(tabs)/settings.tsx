import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} testID="settings-screen">
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: BorderRadius.xl,
            backgroundColor: Colors.greenMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Settings size={40} color={Colors.green} />
        </View>
        <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.textPrimary, marginBottom: 8 }}>
          Settings
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: Colors.textSecondary }}>
          Coming in Phase 2
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/constants/theme';

/**
 * Placeholder component for Claude-generated images
 * Shows a message that images would appear here if Claude generates them
 */
export function ChatImagePlaceholder({ description }: { description?: string }) {
  return (
    <View
      style={{
        backgroundColor: Colors.navyCard,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        minHeight: 120,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: Colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <Image size={24} color={Colors.green} />
      </View>
      <Text
        style={{
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 14,
          color: Colors.textPrimary,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        Image Generated
      </Text>
      {description ? (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          {description}
        </Text>
      ) : null}
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: Colors.textTertiary,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        Image display support coming soon
      </Text>
    </View>
  );
}

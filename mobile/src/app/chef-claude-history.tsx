import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChefClaudeHistoryScreen() {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations from AsyncStorage
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const indexKey = 'pantryiq_chef_conversations_index';
        const data = await AsyncStorage.getItem(indexKey);
        if (data) {
          setConversations(JSON.parse(data));
        }
      } catch (error) {
        console.warn('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, []);

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/chef-claude',
        params: { conversationId },
      } as never);
    },
    []
  );

  const handleDeleteConversation = useCallback((conversationId: string) => {
    Alert.alert('Delete Conversation', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete conversation messages
            const key = `pantryiq_chef_chat_${conversationId}`;
            await AsyncStorage.removeItem(key);

            // Update index
            const indexKey = 'pantryiq_chef_conversations_index';
            const indexData = await AsyncStorage.getItem(indexKey);
            if (indexData) {
              const updated = JSON.parse(indexData).filter((c: ConversationMetadata) => c.id !== conversationId);
              await AsyncStorage.setItem(indexKey, JSON.stringify(updated));
              setConversations(updated);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            console.error('Failed to delete conversation:', error);
            Alert.alert('Error', 'Failed to delete conversation');
          }
        },
      },
    ]);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return dateString;
    }
  };

  const renderConversationCard = ({ item }: { item: ConversationMetadata }) => (
    <Pressable
      testID={`conversation-card-${item.id}`}
      onPress={() => handleOpenConversation(item.id)}
      style={{
        marginHorizontal: 16,
        marginVertical: 8,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 16,
        ...Shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 15,
              color: Colors.textPrimary,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: Colors.textTertiary,
            }}
          >
            {formatDate(item.lastMessageAt)} • {item.messageCount} messages
          </Text>
        </View>
        <Pressable
          testID={`delete-conversation-button-${item.id}`}
          onPress={() => handleDeleteConversation(item.id)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 12,
          }}
        >
          <Trash2 size={16} color="#E74C3C" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient colors={['#0A1628', '#0B1C35']} style={{ flex: 1 }}>
      <SafeAreaView testID="chef-claude-history-screen" style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Pressable
            testID="back-button"
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_700Bold',
                fontSize: 18,
                color: Colors.textPrimary,
              }}
            >
              Conversation History
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Conversations List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.green} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 16,
                color: Colors.textSecondary,
                textAlign: 'center',
              }}
            >
              No conversations yet. Start chatting with Chef Claude!
            </Text>
          </View>
        ) : (
          <FlatList
            testID="conversations-list"
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderConversationCard}
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

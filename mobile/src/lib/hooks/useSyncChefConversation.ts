import { useEffect } from 'react';
import { useChefConversationStore, type ChefMessage } from '@/lib/stores/chefConversationStore';

/**
 * Hook that syncs local component state with the persistent Zustand store
 * This allows the conversation to persist across tab switches and app restarts
 */
export function useSyncChefConversation(
  messages: any[], // local messages state
  conversationId: string,
  onLoad?: (messages: any[]) => void
) {
  const storeMessages = useChefConversationStore((s) => s.messages);
  const setStoreMessages = useChefConversationStore((s) => s.setMessages);
  const storeConversationId = useChefConversationStore((s) => s.conversationId);
  const setStoreConversationId = useChefConversationStore((s) => s.setConversationId);

  // Sync conversation ID
  useEffect(() => {
    if (conversationId && conversationId !== storeConversationId) {
      setStoreConversationId(conversationId);
    }
  }, [conversationId, storeConversationId, setStoreConversationId]);

  // When component mounts, load messages from store if available
  useEffect(() => {
    if (storeMessages.length > 0 && messages.length === 0 && onLoad) {
      // Convert store messages to component messages format
      const convertedMessages = storeMessages.map((m) => ({
        ...m,
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
      }));
      onLoad(convertedMessages);
    }
  }, []); // Only run on mount

  // Sync local messages to store whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      // Convert messages to a serializable format for storage
      const messagesToStore = messages.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      setStoreMessages(messagesToStore);
    }
  }, [messages, setStoreMessages]);
}

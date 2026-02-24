import { useEffect } from 'react';
import { useChefConversationStore, type ChefMessage } from '@/lib/stores/chefConversationStore';

/**
 * Hook that syncs local component state with the persistent Zustand store
 * This allows the conversation to persist across tab switches and app restarts
 */
export function useSyncChefConversation(
  messages: any[], // local messages state
  conversationId: string
) {
  const setStoreMessages = useChefConversationStore((s) => s.setMessages);

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

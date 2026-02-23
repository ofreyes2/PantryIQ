import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChefMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mealAnalysis?: any;
  isFollowUpQuestion?: boolean;
  mealUpdateAction?: {
    type: 'move' | 'edit' | 'delete';
    pending: boolean;
    details: {
      entryName: string;
      fromMealType?: string;
      toMealType?: string;
      changedFields?: string[];
    };
    additionalActions?: any[];
  };
}

export interface ChefConversationState {
  // Current conversation
  conversationId: string;
  messages: ChefMessage[];

  // Actions
  setConversationId: (id: string) => void;
  setMessages: (messages: ChefMessage[]) => void;
  addMessage: (message: ChefMessage) => void;
  clearMessages: () => void;
  updateMessage: (id: string, updates: Partial<ChefMessage>) => void;
}

const generateConversationId = () => `conv-${Date.now()}`;

export const useChefConversationStore = create<ChefConversationState>()(
  persist(
    (set, get) => ({
      conversationId: generateConversationId(),
      messages: [],

      setConversationId: (id: string) => set({ conversationId: id }),

      setMessages: (messages: ChefMessage[]) => set({ messages }),

      addMessage: (message: ChefMessage) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      clearMessages: () => set({ messages: [] }),

      updateMessage: (id: string, updates: Partial<ChefMessage>) =>
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        })),
    }),
    {
      name: 'pantryiq_chef_conversation',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist conversationId and message content, not the full Message objects with Date
      partialize: (state) => ({
        conversationId: state.conversationId,
        messages: state.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
          mealAnalysis: m.mealAnalysis,
          isFollowUpQuestion: m.isFollowUpQuestion,
          mealUpdateAction: m.mealUpdateAction,
        })),
      }),
    }
  )
);

export async function hydrateChefConversationStore(): Promise<void> {
  try {
    await useChefConversationStore.persist.rehydrate();
    // Convert ISO strings back to Date objects
    const state = useChefConversationStore.getState();
    if (state.messages.length > 0) {
      const messagesWithDates = state.messages.map((m) => ({
        ...m,
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : m.timestamp,
      }));
      useChefConversationStore.setState({ messages: messagesWithDates });
    }
  } catch (error) {
    console.warn('Failed to hydrate chef conversation store:', error);
  }
}

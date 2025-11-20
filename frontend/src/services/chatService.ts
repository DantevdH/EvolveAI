import { storage } from '@/src/utils/storage';

export interface ChatMessageData {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

// Storage key helpers
const getChatStorageKey = (userProfileId: number, planId?: number | null): string => {
  if (planId !== null && planId !== undefined) {
    return `chat_conversation_${userProfileId}_plan_${planId}`;
  }
  return `chat_conversation_${userProfileId}_general`;
};

export class ChatService {
  /**
   * Save conversation history to AsyncStorage
   */
  static async saveConversation(
    userProfileId: number,
    messages: ChatMessageData[],
    planId?: number | null
  ): Promise<void> {
    try {
      const key = getChatStorageKey(userProfileId, planId);
      // Filter out typing indicators and welcome messages (don't save these)
      const messagesToSave = messages.filter(
        msg => msg.id !== 'typing' && msg.id !== 'welcome'
      );
      await storage.setItem(key, messagesToSave);
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw - we don't want to block the UI if saving fails
    }
  }

  /**
   * Load conversation history from AsyncStorage
   */
  static async loadConversationHistory(
    userProfileId: number,
    planId?: number | null
  ): Promise<ChatMessageData[]> {
    try {
      const key = getChatStorageKey(userProfileId, planId);
      const messages = await storage.getItem<ChatMessageData[]>(key);
      if (!messages || !Array.isArray(messages)) {
        return [];
      }
      
      // Convert timestamp strings back to Date objects (they get serialized as strings)
      return messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history
   */
  static async clearConversationHistory(
    userProfileId: number,
    planId?: number | null
  ): Promise<void> {
    try {
      const key = getChatStorageKey(userProfileId, planId);
      await storage.removeItem(key);
    } catch (error) {
      console.error('Error clearing conversation history:', error);
    }
  }
}

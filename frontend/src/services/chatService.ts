import { storage } from '@/src/utils/storage';
import { logger } from '../utils/logger';
import { CHAT_CONFIG } from '@/src/constants';

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
   * Automatically filters out messages older than expiration time
   */
  static async saveConversation(
    userProfileId: number,
    messages: ChatMessageData[],
    planId?: number | null
  ): Promise<void> {
    try {
      const key = getChatStorageKey(userProfileId, planId);
      const now = Date.now();
      
      // Filter out typing indicators, welcome messages, and expired messages
      const messagesToSave = messages.filter(msg => {
        if (msg.id === 'typing' || msg.id === 'welcome') {
          return false;
        }
        
        // Check if message is expired
        const messageTime = msg.timestamp instanceof Date 
          ? msg.timestamp.getTime() 
          : new Date(msg.timestamp).getTime();
        const age = now - messageTime;
        
        return age < CHAT_CONFIG.HISTORY_EXPIRATION_MS;
      });
      
      await storage.setItem(key, messagesToSave);
    } catch (error) {
      logger.error('Error saving conversation', error);
      // Don't throw - we don't want to block the UI if saving fails
    }
  }

  /**
   * Load conversation history from AsyncStorage
   * Automatically filters out expired messages
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
      
      const now = Date.now();
      
      // Convert timestamp strings back to Date objects and filter expired messages
      const validMessages = messages
        .map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
        }))
        .filter(msg => {
          const messageTime = msg.timestamp instanceof Date 
            ? msg.timestamp.getTime() 
            : new Date(msg.timestamp).getTime();
          const age = now - messageTime;
          
          return age < CHAT_CONFIG.HISTORY_EXPIRATION_MS;
        });
      
      // If we filtered out expired messages, save the cleaned list back
      if (validMessages.length < messages.length) {
        await storage.setItem(key, validMessages);
      }
      
      return validMessages;
    } catch (error) {
      logger.error('Error loading conversation history', error);
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
      logger.error('Error clearing conversation history', error);
    }
  }
}

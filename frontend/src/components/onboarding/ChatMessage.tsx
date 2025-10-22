import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  isTyping?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  isTyping = false
}) => {
  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer
    ]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="brain" size={16} color="white" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.aiText
        ]}>
          {message}
          {isTyping && <Text style={styles.cursor}>|</Text>}
        </Text>
        
        {timestamp && (
          <Text style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.aiTimestamp
          ]}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
      
      {isUser && (
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.inputBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: colors.text,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: 'white',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: colors.muted,
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ChatMessage;

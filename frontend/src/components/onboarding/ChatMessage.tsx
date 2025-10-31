import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  isTyping?: boolean;
}

// Animated typing dots component
const TypingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    console.log('🎯 TypingDots: Component mounted, starting animation');
    
    const createPulseAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start animations with staggered delays
    const animation1 = createPulseAnimation(dot1, 0);
    const animation2 = createPulseAnimation(dot2, 200);
    const animation3 = createPulseAnimation(dot3, 400);

    // Start all animations
    animation1.start();
    animation2.start();
    animation3.start();

    console.log('🎯 TypingDots: All animations started');

    // Cleanup function
    return () => {
      console.log('🎯 TypingDots: Component unmounting, stopping animations');
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, []);

  return (
    <View style={styles.typingContainer}>
      <Animated.Text style={[styles.typingDot, { opacity: dot1 }]}>•</Animated.Text>
      <Animated.Text style={[styles.typingDot, { opacity: dot2 }]}>•</Animated.Text>
      <Animated.Text style={[styles.typingDot, { opacity: dot3 }]}>•</Animated.Text>
    </View>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isUser,
  timestamp,
  isTyping = false
}) => {
  // Debug logging
  
  return (
    <View style={[
      styles.container,
      isUser ? styles.userContainer : styles.aiContainer
    ]}>
      {!isUser && (
        <View style={styles.avatar}>
          <MaterialIcons name="psychology" size={16} color="white" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble
      ]}>
        {isTyping && !message ? (
          <TypingDots />
        ) : (
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText
          ]}>
            {message}
            {isTyping && message && <Text style={styles.cursor}>|</Text>}
          </Text>
        )}
        
        {timestamp && !isTyping && (
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
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  typingDot: {
    fontSize: 24,
    color: colors.primary,
    marginHorizontal: 3,
    fontWeight: 'bold',
  },
});

export default ChatMessage;

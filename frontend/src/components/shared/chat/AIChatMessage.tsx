import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../constants/designSystem';
import { TypingDots } from './TypingDots';

interface AIChatMessageProps {
  username?: string;
  analysisPhase?: 'initial' | 'followup' | 'outline' | 'generation' | null;
  customMessage?: string;
  aiMessage?: string;
  onTypingComplete?: () => void;
  skipAnimation?: boolean;
  isLoading?: boolean;
  showHeader?: boolean;
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  username,
  analysisPhase,
  customMessage,
  aiMessage,
  onTypingComplete,
  skipAnimation = false,
  isLoading = false,
  showHeader = true,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fullMessage = useMemo(() => {
    if (customMessage) return customMessage;
    if (aiMessage) return aiMessage;
    return `Hi ${username}! 👋\n\nI'm preparing your personalized training journey. Let's get started! 🚀`;
  }, [customMessage, aiMessage, username]);

  const memoizedOnTypingComplete = useCallback(() => {
    onTypingComplete?.();
  }, [onTypingComplete]);

  useEffect(() => {
    mountedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fadeAnim]);

  useEffect(() => {
    typingStartedRef.current = false;
    setDisplayedText('');
    setShowTypingIndicator(true);
    setTypingComplete(false);
    
    if (skipAnimation) {
      setDisplayedText(fullMessage);
      setShowTypingIndicator(false);
      setTypingComplete(true);
      memoizedOnTypingComplete();
      return;
    }
    
    let timeoutId: ReturnType<typeof setTimeout>;
    let currentIndex = 0;

    const typeText = () => {
      if (!mountedRef.current) return;
      
      if (currentIndex < fullMessage.length) {
        setDisplayedText(fullMessage.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(typeText, 30);
      } else {
        setShowTypingIndicator(false);
        setTypingComplete(true);
        memoizedOnTypingComplete();
      }
    };

    const startTimeout = setTimeout(() => {
      if (mountedRef.current) {
        typeText();
      }
    }, 500);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeoutId);
    };
  }, [fullMessage, skipAnimation, memoizedOnTypingComplete]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.messageWrapper, { opacity: fadeAnim }]}>
        <View style={styles.aiAvatar}>
          <MaterialIcons name="psychology" size={18} color="white" />
        </View>
        <View style={styles.chatBubble}>
          {showHeader && (
            <View style={styles.chatHeader}>
              <View style={styles.aiNameContainer}>
                <Text style={styles.aiName}>AI Coach</Text>
              </View>
              <View style={styles.onlineIndicator}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>online</Text>
              </View>
            </View>
          )}
          
          <View style={styles.messageContent}>
            {isLoading && !displayedText ? (
              <TypingDots />
            ) : (
              <Text style={styles.messageText}>
                {displayedText}
                {showTypingIndicator && !isLoading && <Text style={styles.cursor}>|</Text>}
              </Text>
            )}
          </View>
          
          <View style={styles.bubbleTail} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chatBubble: {
    backgroundColor: colors.inputBackground,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    bottom: 8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.inputBackground,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiNameContainer: {
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
  messageContent: {
    minHeight: 20,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '400',
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});


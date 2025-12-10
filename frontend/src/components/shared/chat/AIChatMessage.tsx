import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, StyleProp, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { TypingDots } from './TypingDots';

interface AIChatMessageProps {
  username?: string;
  analysisPhase?: 'initial' | 'outline' | 'generation' | null;
  customMessage?: string;
  aiMessage?: string;
  onTypingComplete?: () => void;
  skipAnimation?: boolean;
  isLoading?: boolean;
  showHeader?: boolean;
  messageStyle?: StyleProp<TextStyle>;
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
  messageStyle,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const callbackCalledRef = useRef(false);
  const lastMessageRef = useRef<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullMessage = useMemo(() => {
    // If loading, return empty string to prevent default message from showing
    if (isLoading) return '';
    if (customMessage !== undefined && customMessage !== null) {
      // Prevent empty string messages from rendering as empty bubbles
      return customMessage.trim() || '';
    }
    if (aiMessage) return aiMessage;
    return `Hi ${username}! 👋\n\nI'm preparing your personalized training journey. Let's get started! 🚀`;
  }, [customMessage, aiMessage, username, isLoading]);

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
    
    // Pulse animation for online indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    
    return () => {
      mountedRef.current = false;
      pulseAnimation.stop();
    };
  }, [fadeAnim, pulseAnim]);

  useEffect(() => {
    // Only reset if this is a new message
    const isNewMessage = lastMessageRef.current !== fullMessage;


    if (isNewMessage) {
      typingStartedRef.current = false;
      callbackCalledRef.current = false;
      lastMessageRef.current = fullMessage;
      setDisplayedText('');
      setShowTypingIndicator(true);
      setTypingComplete(false);

      // Clear any existing timeouts when message changes
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typeIntervalRef.current) {
        clearTimeout(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    }

    // If loading, don't start typing animation - just show loading dots
    if (isLoading) {
      if (isNewMessage) {
        setDisplayedText('');
        setShowTypingIndicator(false);
      }
      return;
    }

    // Don't restart if we've already completed this message
    if (isNewMessage && skipAnimation) {
      setDisplayedText(fullMessage);
      setShowTypingIndicator(false);
      setTypingComplete(true);
      if (!callbackCalledRef.current && onTypingComplete) {
        callbackCalledRef.current = true;
        // Use setTimeout to avoid calling during render
        setTimeout(() => {
          memoizedOnTypingComplete();
        }, 0);
      }
      return;
    }

    // Don't restart typing if we've already completed OR already started
    if (!isNewMessage && (typingComplete || typingStartedRef.current)) {
      return;
    }

    // Don't start typing again if already in progress
    if (typingStartedRef.current) {
      return;
    }

    let currentIndex = 0;

    const typeText = () => {
      if (!mountedRef.current) return;

      if (currentIndex < fullMessage.length) {
        setDisplayedText(fullMessage.slice(0, currentIndex + 1));
        currentIndex++;
        typeIntervalRef.current = setTimeout(typeText, 30);
      } else {
        setShowTypingIndicator(false);
        setTypingComplete(true);
        if (!callbackCalledRef.current && onTypingComplete) {
          callbackCalledRef.current = true;
          memoizedOnTypingComplete();
        }
      }
    };

    // Only start typing if this is a new message and we haven't started yet
    if (isNewMessage && !typingStartedRef.current) {
      typingStartedRef.current = true; // Mark as started IMMEDIATELY

      typingTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          typeText();
        }
      }, 500);
    }

    // Cleanup only on unmount, not on re-render
    return () => {
      // Only clear if component is unmounting
      if (!mountedRef.current) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (typeIntervalRef.current) clearTimeout(typeIntervalRef.current);
      }
    };
  }, [fullMessage, skipAnimation, isLoading, memoizedOnTypingComplete, onTypingComplete, typingComplete, displayedText]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.messageWrapper, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={[createColorWithOpacity(colors.secondary, 0.35), createColorWithOpacity(colors.secondary, 0.15)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiAvatar}
        >
          <MaterialIcons name="psychology" size={18} color={colors.primary} />
        </LinearGradient>
        <View style={styles.chatBubble}>
          {showHeader && (
            <View style={styles.chatHeader}>
              <LinearGradient
                colors={[createColorWithOpacity(colors.primary, 0.18), createColorWithOpacity(colors.primary, 0.08)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiNameContainer}
              >
                <Text style={styles.aiName}>AI Coach</Text>
              </LinearGradient>
              <View style={styles.onlineIndicator}>
                <Animated.View 
                  style={[
                    styles.onlineDot,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseAnim.interpolate({
                        inputRange: [1, 1.3],
                        outputRange: [0.8, 1],
                      }),
                    }
                  ]} 
                />
                <Text style={styles.onlineText}>online</Text>
              </View>
            </View>
          )}
          
          <View style={styles.messageContent}>
            {isLoading && !displayedText ? (
              <TypingDots dotColor={createColorWithOpacity(colors.text, 0.85)} />
            ) : (
              <Text style={[styles.messageText, messageStyle]}>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'flex-start',
    width: '100%',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  aiAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: createColorWithOpacity(colors.primary, 0.2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chatBubble: {
    backgroundColor: createColorWithOpacity(colors.background, 0.95),
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: '85%',
    position: 'relative',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.text, 0.08),
    shadowColor: createColorWithOpacity(colors.text, 0.15),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
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
    borderRightColor: createColorWithOpacity(colors.background, 0.95),
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiNameContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: createColorWithOpacity(colors.primary, 0.2),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiName: {
    fontSize: 13,
    fontWeight: '700',
    color: createColorWithOpacity(colors.text, 0.9),
    letterSpacing: 0.3,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: createColorWithOpacity(colors.primary, 0.8),
    fontWeight: '500',
  },
  messageContent: {
    minHeight: 20,
  },
  messageText: {
    fontSize: 16,
    color: createColorWithOpacity(colors.text, 0.85),
    lineHeight: 23,
    fontWeight: '500',
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});


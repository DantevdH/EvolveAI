import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/designSystem';

interface AIChatMessageProps {
  username?: string;
  analysisPhase?: 'initial' | 'outline' | 'generation' | null;
  customMessage?: string;
  aiMessage?: string; // AI message from backend
  onTypingComplete?: () => void;
  skipAnimation?: boolean;
  isLoading?: boolean; // Show loading dots while waiting for backend response
}

// Animated typing dots component
const TypingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
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

    // Cleanup function
    return () => {
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

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  username,
  analysisPhase,
  customMessage,
  aiMessage,
  onTypingComplete,
  skipAnimation = false,
  isLoading = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get the message to display - prioritize dynamic messages from backend
  const fullMessage = useMemo(() => {
    // Priority 1: Custom message (for special cases)
    if (customMessage) {
      return customMessage;
    }
    
    // Priority 2: AI-generated message from backend (MAIN USE CASE)
    if (aiMessage) {
      return aiMessage;
    }
    
    // Priority 3: Fallback message (only shown if backend fails)
    return `Hi ${username}! 👋\n\nI'm preparing your personalized training journey. Let's get started! 🚀`;
  }, [customMessage, aiMessage, username]);

  // Memoize the typing complete callback to prevent dependency issues
  const memoizedOnTypingComplete = useCallback(() => {
    onTypingComplete?.();
  }, [onTypingComplete]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Fade in animation
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
    // Reset typing flag when message changes
    typingStartedRef.current = false;
    
    // Reset state when message changes
    setDisplayedText('');
    setShowTypingIndicator(true);
    setTypingComplete(false);
    
    // If skipping animation, show full text immediately
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
        timeoutId = setTimeout(typeText, 30); // Adjust speed here
      } else {
        setShowTypingIndicator(false);
        setTypingComplete(true);
        memoizedOnTypingComplete();
      }
    };

    // Start typing after a short delay
    const startTimeout = setTimeout(() => {
      if (mountedRef.current) {
        typeText();
      }
    }, 500);

    return () => {
      clearTimeout(startTimeout);
      clearTimeout(timeoutId);
    };
  }, [fullMessage, skipAnimation]); // Removed onTypingComplete from dependencies to prevent re-renders

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.messageWrapper, { opacity: fadeAnim }]}>
        <View style={styles.aiAvatar}>
          <MaterialIcons name="psychology" size={18} color="white" />
        </View>
        <View style={styles.chatBubble}>
          <View style={styles.chatHeader}>
            <View style={styles.aiNameContainer}>
              <Text style={styles.aiName}>AI Coach</Text>
            </View>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>online</Text>
            </View>
          </View>
          
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
          
          {/* Chat bubble tail */}
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chatBubble: {
    backgroundColor: colors.inputBackground,
    borderRadius: 18,
    borderBottomLeftRadius: 4, // Messenger-style tail connection point
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleTail: {
    position: 'absolute',
    left: -6,
    bottom: 8, // Position near bottom of bubble to align with avatar
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
    backgroundColor: '#4CAF50', // Green color
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    color: '#4CAF50', // Green color
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

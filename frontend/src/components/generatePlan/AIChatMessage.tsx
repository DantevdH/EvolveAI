import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface AIChatMessageProps {
  username?: string;
  analysisPhase?: 'initial' | 'followup' | 'outline' | 'generation' | null;
  customMessage?: string;
  onTypingComplete?: () => void;
  skipAnimation?: boolean;
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  username,
  analysisPhase,
  customMessage,
  onTypingComplete,
  skipAnimation = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingStartedRef = useRef(false);
  const mountedRef = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const getMessageContent = () => {
    switch (analysisPhase) {
      case 'initial':
        return {
          greeting: `Hi ${username}! 👋`,
          analysis: "I'm excited to help you on your fitness journey! I've analyzed your personal profile and can see your starting point, plus I love your fitness goals and ambition!",
          conclusion: "To create the perfect plan for YOU, I need to understand you better. Ready to answer some quick questions? 🚀"
        };
      case 'followup':
        return {
          greeting: `Hi ${username}! 💪`,
          analysis: "Great answers! I'm getting a clearer picture of your fitness journey, including your preferences, lifestyle patterns, and the specific challenges and motivations that drive you.",
          conclusion: "Just a few more questions to fine-tune your personalized plan. We're almost there! ✨"
        };
      case 'outline':
        return {
          greeting: `Hi ${username}! 📋`,
          analysis: "Excellent! I've analyzed all your responses and I'm now crafting a comprehensive training plan outline tailored specifically to your goals, experience level, and lifestyle.",
          conclusion: "Your personalized training plan outline is being created. This will be the foundation of your fitness journey! 💪"
        };
      case 'generation':
        return {
          greeting: `Hi ${username}! 🎉`,
          analysis: "Fantastic! I've completed my analysis and I'm thrilled with what I've learned about your complete fitness profile - you're going to love this personalized workout plan that I've crafted just for you!",
          conclusion: "Your custom workout plan is ready! Let's create something amazing together! 🔥"
        };
      default:
        return {
          greeting: `Hi ${username}! 👋`,
          analysis: "I've analyzed your information:",
          conclusion: "I have some questions for you."
        };
    }
  };

  const content = useMemo(() => getMessageContent(), [username, analysisPhase]);
  const fullMessage = useMemo(() => {
    if (customMessage) {
      return customMessage;
    }
    return `${content.greeting}\n\n${content.analysis}\n\n${content.conclusion}`;
  }, [customMessage, content]);

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
          <IconSymbol name="brain" size={18} color="white" />
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
            <Text style={styles.messageText}>
              {displayedText}
              {showTypingIndicator && <Text style={styles.cursor}>|</Text>}
            </Text>
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
});

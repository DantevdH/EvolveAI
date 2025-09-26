import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../constants/designSystem';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface AIChatMessageProps {
  username: string;
  analysisPhase: 'initial' | 'followup' | 'generation' | null;
  onTypingComplete?: () => void;
}

export const AIChatMessage: React.FC<AIChatMessageProps> = ({
  username,
  analysisPhase,
  onTypingComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(true);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingStartedRef = useRef(false);
  const mountedRef = useRef(true);

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
  const fullMessage = useMemo(() => 
    `${content.greeting}\n\n${content.analysis}\n\n${content.conclusion}`,
    [content]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Prevent double typing by checking if already started
    if (typingStartedRef.current) {
      return;
    }
    
    typingStartedRef.current = true;
    
    // Reset state when message changes
    setDisplayedText('');
    setShowTypingIndicator(true);
    setTypingComplete(false);
    
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
        onTypingComplete?.();
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
  }, [fullMessage]); // Removed onTypingComplete from dependencies

  return (
    <View style={styles.container}>
      <View style={styles.chatBubble}>
        <View style={styles.chatHeader}>
          <View style={styles.aiAvatar}>
            <IconSymbol name="brain" size={16} color={colors.primary} />
          </View>
          <Text style={styles.aiName}>AI Coach</Text>
        </View>
        
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>
            {displayedText}
            {showTypingIndicator && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'flex-start', // Start from top instead of center
  },
  chatBubble: {
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    width: '100%',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryTransparentLight || `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  messageContent: {
    minHeight: 20,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

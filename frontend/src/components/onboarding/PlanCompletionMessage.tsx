import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

interface PlanCompletionMessageProps {
  message: string;
  onContinue: () => void;
  onViewPlan: () => void;
}

const PlanCompletionMessage: React.FC<PlanCompletionMessageProps> = ({
  message,
  onContinue,
  onViewPlan
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Type out the message
    let currentIndex = 0;
    const typeText = () => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeText, 30);
      } else {
        // Show buttons after typing is complete
        setTimeout(() => {
          setShowButtons(true);
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 500);
      }
    };

    // Start typing after a short delay
    setTimeout(typeText, 300);
  }, [message, fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* AI Avatar */}
        <View style={styles.avatar}>
          <Ionicons name="brain" size={32} color="white" />
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            {displayedText}
            {displayedText.length < message.length && (
              <Text style={styles.cursor}>|</Text>
            )}
          </Text>
        </View>

        {/* Action Buttons */}
        {showButtons && (
          <Animated.View style={[styles.buttonContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.buttonRow}>
              <View style={styles.primaryButton} onTouchEnd={onViewPlan}>
                <Ionicons name="eye" size={20} color="white" />
                <Text style={styles.primaryButtonText}>View Plan</Text>
              </View>
              
              <View style={styles.secondaryButton} onTouchEnd={onContinue}>
                <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Continue</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  cursor: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PlanCompletionMessage;

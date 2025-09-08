/**
 * Motivational Quote Component - Rotating carousel of motivational messages
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  "Every rep counts. Keep pushing!",
  "Progress, not perfection.",
  "Your only limit is you.",
  "AI is here to help you evolve!",
  "Small steps, big results.",
];

interface MotivationalQuoteProps {
  autoRotate?: boolean;
  rotationInterval?: number;
}

export const MotivationalQuote: React.FC<MotivationalQuoteProps> = ({
  autoRotate = true,
  rotationInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoRotate) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        (prevIndex + 1) % MOTIVATIONAL_QUOTES.length
      );
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotationInterval]);

  return (
    <View style={styles.container}>
      <View style={styles.quoteContainer}>
        <Ionicons name="sparkles" size={20} color={colors.primary} />
        <Text style={styles.quoteText}>
          {MOTIVATIONAL_QUOTES[currentIndex]}
        </Text>
      </View>
      
      {/* Quote indicators */}
      <View style={styles.indicators}>
        {MOTIVATIONAL_QUOTES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentIndex && styles.activeIndicator,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  activeIndicator: {
    backgroundColor: colors.primary,
  },
});

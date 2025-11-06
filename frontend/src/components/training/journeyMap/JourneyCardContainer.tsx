/**
 * Journey Card Container Component
 * Wraps the journey map with a card-style container and header
 * Candy Crush-style visual design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';

interface JourneyCardContainerProps {
  title: string;
  children: React.ReactNode;
}

const JourneyCardContainer: React.FC<JourneyCardContainerProps> = ({ title, children }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[colors.primary, '#6B1A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text 
          style={styles.headerTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {title.toUpperCase()}
        </Text>
      </LinearGradient>

      {/* Map content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 0, // Important for flex children to shrink
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: createColorWithOpacity(colors.text, 0.8),
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 16,
    minHeight: 0, // Important for flex children to shrink
  },
});

export default JourneyCardContainer;


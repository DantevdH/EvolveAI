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
  headerAccessory?: React.ReactNode;
}

const JourneyCardContainer: React.FC<JourneyCardContainerProps> = ({ title, children, headerAccessory }) => {
  return (
    <View style={styles.cardContainer}>
      {/* Elegant Header with Gradient */}
      <LinearGradient
        colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {title}
          </Text>
          {headerAccessory && <View style={styles.headerAccessory}>{headerAccessory}</View>}
        </View>
      </View>
      </LinearGradient>

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
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    minHeight: 0,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.1),
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  headerAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 12,
    maxWidth: 180,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
    minHeight: 0,
  },
});

export default JourneyCardContainer;


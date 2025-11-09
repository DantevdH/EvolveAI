/**
 * Journey Card Container Component
 * Wraps the journey map with a card-style container and header
 * Candy Crush-style visual design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, createColorWithOpacity } from '../../../constants/colors';

interface JourneyCardContainerProps {
  title: string;
  children: React.ReactNode;
  headerAccessory?: React.ReactNode;
}

const JourneyCardContainer: React.FC<JourneyCardContainerProps> = ({ title, children, headerAccessory }) => {
  return (
    <View style={styles.cardContainer}>
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
        <View style={styles.headerAccent} />
      </View>

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
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.tertiary, 0.1),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
    minHeight: 0,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: colors.card,
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
    fontWeight: '600',
    color: createColorWithOpacity(colors.text, 0.65),
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  headerAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 12,
    maxWidth: 180,
  },
  headerAccent: {
    marginTop: 10,
    width: 44,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.secondary,
  },
  content: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 20,
    paddingHorizontal: 20,
    minHeight: 0,
  },
});

export default JourneyCardContainer;


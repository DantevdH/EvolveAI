/**
 * Week Card Component
 * Renders individual week cards with focus theme, status, and animations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { GradientColors, createGradientColors } from '../../../types/common';
import { WeekNodeData } from './types';
import { WeekNodeAnimations } from './WeekNodeAnimations';

interface WeekNodeProps {
  node: WeekNodeData;
  onPress: (node: WeekNodeData) => void;
  animations?: WeekNodeAnimations;
  totalWeeks?: number;
}

const WeekCard: React.FC<WeekNodeProps> = ({ node, onPress, animations, totalWeeks = 1 }) => {
  const isCurrentWeek = node.status === 'current';
  const cardWidth = 220; // Smaller, more compact cards
  const cardHeight = 65;
  
  // Determine if this is first or last card
  const isFirstCard = node.weekNumber === 1;
  const isLastCard = node.weekNumber === totalWeeks;
  
  // Circle visibility
  const showTopCircle = !isFirstCard;    // No top circle on first card
  const showBottomCircle = !isLastCard;  // No bottom circle on last card

  // Status-based styling
  const getCardStyle = () => {
    switch (node.status) {
      case 'completed':
        return {
          backgroundColors: createGradientColors(
            createColorWithOpacity(colors.secondary, 0.15),
            createColorWithOpacity(colors.secondary, 0.08)
          ),
          borderColor: createColorWithOpacity(colors.secondary, 0.4),
          weekNumberBg: colors.secondary,
          weekNumberText: colors.card,
          focusThemeColor: createColorWithOpacity(colors.secondary, 0.9),
          shadowColor: colors.secondary,
        };
      case 'current':
        return {
          backgroundColors: createGradientColors(
            createColorWithOpacity(colors.secondary, 0.2),
            createColorWithOpacity(colors.secondary, 0.12)
          ),
          borderColor: createColorWithOpacity(colors.secondary, 0.6),
          weekNumberBg: colors.secondary,
          weekNumberText: colors.card,
          focusThemeColor: createColorWithOpacity(colors.secondary, 0.95),
          shadowColor: colors.secondary,
        };
      case 'locked':
      default:
        return {
          backgroundColors: createGradientColors(
            createColorWithOpacity(colors.muted, 0.08),
            createColorWithOpacity(colors.muted, 0.04)
          ),
          borderColor: createColorWithOpacity(colors.muted, 0.2),
          weekNumberBg: colors.muted,
          weekNumberText: colors.card,
          focusThemeColor: createColorWithOpacity(colors.muted, 0.7),
          shadowColor: colors.muted,
        };
    }
  };

  const cardStyle = getCardStyle();

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          left: node.x - cardWidth / 2,
          top: node.y - cardHeight / 2,
          width: cardWidth,
          height: cardHeight,
          shadowColor: cardStyle.shadowColor,
          shadowOpacity: node.status === 'locked' ? 0.15 : node.status === 'current' ? 0.35 : 0.25,
          shadowRadius: node.status === 'current' ? 16 : 10,
          shadowOffset: { width: 0, height: node.status === 'current' ? 6 : 3 },
          elevation: node.status === 'current' ? 10 : 6,
        },
      ]}
      onPress={() => onPress(node)}
      activeOpacity={0.85}
      disabled={node.status === 'locked'}
    >

      {/* Gradient background */}
      <LinearGradient
        colors={cardStyle.backgroundColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.cardInner, { borderColor: cardStyle.borderColor }]}>
          {/* Week number badge */}
          <View style={[styles.weekNumberBadge, { backgroundColor: cardStyle.weekNumberBg }]}>
            <Text style={[styles.weekNumber, { color: cardStyle.weekNumberText }]}>
              {node.weekNumber}
            </Text>
          </View>

          {/* Content area */}
          <View style={styles.contentArea}>
            {/* Focus theme */}
            {node.focusTheme ? (
              <Text style={[styles.focusTheme, { color: cardStyle.focusThemeColor }]} numberOfLines={2} ellipsizeMode="tail">
                {node.focusTheme}
              </Text>
            ) : (
              <Text style={[styles.focusTheme, { color: cardStyle.focusThemeColor }]}>
                Week {node.weekNumber}
              </Text>
            )}

            {/* Status indicators */}
            <View style={styles.statusRow}>
              {node.status === 'completed' && (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.secondary} />
                </View>
              )}
              {node.status === 'current' && (
                <View style={styles.statusBadge}>
                  <Ionicons name="play-circle" size={12} color={colors.secondary} />
                </View>
              )}
        {node.status === 'locked' && (
                <View style={styles.statusBadge}>
                  <Ionicons name="lock-closed" size={10} color={createColorWithOpacity(colors.muted, 0.6)} />
          </View>
        )}
      </View>
          </View>
        </View>
      </LinearGradient>
      
      {/* Connection circles at card edges */}
      {showTopCircle && (
        <View
          style={[
            styles.connectionCircle,
            {
              left: cardWidth / 2 - 4, // Center horizontally, minus radius
              top: -4, // Center on the top edge (half above, half below)
              backgroundColor: node.status === 'completed' || node.status === 'current' 
                ? colors.secondary 
                : createColorWithOpacity(colors.muted, 0.4),
            },
          ]}
        />
      )}
      
      {showBottomCircle && (
        <View
          style={[
            styles.connectionCircle,
            {
              left: cardWidth / 2 - 4, // Center horizontally, minus radius
              bottom: -4, // Center on the bottom edge (half above, half below)
              backgroundColor: node.status === 'completed' || node.status === 'current' 
                ? colors.secondary 
                : createColorWithOpacity(colors.muted, 0.4),
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    borderRadius: 12,
    zIndex: 10,
    overflow: 'visible', // Allow circles to extend beyond card edges
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.card, 0.5),
  },
  weekNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  weekNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 2,
  },
  focusTheme: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionCircle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.card,
    zIndex: 20, // Above the card
  },
});

export default WeekCard;

/**
 * Progress Summary Component - Quick stats overview
 * Responsive design that adapts to all screen sizes
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity, goldenGradient } from '../../constants/colors';

interface StatData {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ProgressSummaryProps {
  streak?: number;
  weeklyTrainings?: number;
  weeksCompleted?: number;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  streak = 0,
  weeklyTrainings = 0,
  weeksCompleted = 0,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  
  // Calculate responsive dimensions
  const cardDimensions = useMemo(() => {
    const HORIZONTAL_PADDING = 16;
    const CARD_GAP = 8;
    const TOTAL_GAPS = CARD_GAP * 2; // 2 gaps between 3 cards
    const AVAILABLE_WIDTH = screenWidth - (HORIZONTAL_PADDING * 2);
    const CARD_WIDTH = Math.floor((AVAILABLE_WIDTH - TOTAL_GAPS) / 3);
    
    return {
      cardWidth: CARD_WIDTH,
      gap: CARD_GAP,
      padding: HORIZONTAL_PADDING,
    };
  }, [screenWidth]);

  const stats: StatData[] = [
    {
      title: 'Streak',
      value: streak.toString(),
      subtitle: 'days',
      icon: 'flame',
    },
    {
      title: 'This Week',
      value: weeklyTrainings.toString(),
      subtitle: 'trainings',
      icon: 'calendar',
    },
    {
      title: 'Weeks',
      value: weeksCompleted.toString(),
      subtitle: 'completed',
      icon: 'checkmark-circle',
    },
  ];

  return (
    <View style={[styles.container, { paddingHorizontal: cardDimensions.padding, gap: cardDimensions.gap }]}>
      {stats.map((stat, index) => (
        <StatCard 
          key={index} 
          {...stat} 
          cardWidth={cardDimensions.cardWidth}
        />
      ))}
    </View>
  );
};

interface StatCardProps extends StatData {
  cardWidth: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  cardWidth,
}) => {
  const fontSize = useMemo(() => {
    if (cardWidth < 100) {
      return { title: 9, value: 14, subtitle: 8, icon: 10 };
    } else if (cardWidth < 120) {
      return { title: 10, value: 16, subtitle: 8, icon: 11 };
    } else {
      return { title: 11, value: 18, subtitle: 9, icon: 12 };
    }
  }, [cardWidth]);

  const iconBadgeBackground = createColorWithOpacity(colors.secondary, 0.18);
  const iconBadgeBorder = createColorWithOpacity(colors.secondary, 0.35);
  const primaryTextColor = colors.primary;
  const secondaryTextColor = createColorWithOpacity(colors.primary, 0.65);

  return (
    <View style={[styles.statCard, { width: cardWidth }]}> 
      <LinearGradient
        colors={goldenGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View
          style={[styles.iconBadge, {
            backgroundColor: iconBadgeBackground,
            borderColor: iconBadgeBorder,
          }]}
        >
          <Ionicons
            name={icon}
            size={fontSize.icon + 4}
            color={primaryTextColor}
          />
        </View>

        <Text
          style={[styles.statValue, {
            fontSize: fontSize.value + 4,
            color: primaryTextColor,
          }]}
          numberOfLines={1}
        >
          {value}
        </Text>

        <View style={styles.statTextContainer}>
          <Text
            style={[styles.statTitle, {
              fontSize: fontSize.title,
              color: primaryTextColor,
            }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.statSubtitle, {
              fontSize: fontSize.subtitle,
              color: secondaryTextColor,
            }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: createColorWithOpacity(colors.tertiary, 0.08),
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    minWidth: 80,
  },
  gradientBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 80,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
  },
  statTextContainer: {
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  statTitle: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statSubtitle: {
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '600',
  },
});

export default ProgressSummary;

/**
 * Progress Summary Component - Quick stats overview
 * Responsive design that adapts to all screen sizes
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../constants/colors';

interface StatData {
  title: string;
  value: string;
  subtitle: string;
  color: string;
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
      color: colors.primary,
      icon: 'flame',
    },
    {
      title: 'This Week',
      value: weeklyTrainings.toString(),
      subtitle: 'trainings',
      color: colors.tertiary,
      icon: 'calendar',
    },
    {
      title: 'Weeks',
      value: weeksCompleted.toString(),
      subtitle: 'completed',
      color: colors.secondary,
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
  color,
  icon,
  cardWidth,
}) => {
  // Calculate responsive font sizes based on card width
  const fontSize = useMemo(() => {
    if (cardWidth < 100) {
      return { title: 9, value: 14, subtitle: 8, icon: 10 };
    } else if (cardWidth < 120) {
      return { title: 10, value: 16, subtitle: 8, icon: 11 };
    } else {
      return { title: 11, value: 18, subtitle: 9, icon: 12 };
    }
  }, [cardWidth]);

  // Get gradient colors based on card type - using only color template
  const getGradientColors = () => {
    if (title === 'Streak') {
      return [createColorWithOpacity(colors.primary, 0.4), createColorWithOpacity(colors.primary, 0.35)]; // Primary red
    } else if (title === 'This Week') {
      return [createColorWithOpacity(colors.tertiary, 0.4), createColorWithOpacity(colors.tertiary, 0.35)]; // Tertiary teal
    } else {
      return [createColorWithOpacity(colors.secondary, 0.4), createColorWithOpacity(colors.secondary, 0.35)]; // Secondary blue
    }
  };

  return (
    <View style={[styles.statCard, { width: cardWidth }]}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Icon Badge */}
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={fontSize.icon + 4} color={colors.text} />
        </View>
        
        {/* Value - Large and prominent */}
        <Text 
          style={[styles.statValue, { fontSize: fontSize.value + 4 }]} 
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        
        {/* Title and Subtitle */}
        <View style={styles.statTextContainer}>
          <Text 
            style={[styles.statTitle, { fontSize: fontSize.title }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text 
            style={[styles.statSubtitle, { fontSize: fontSize.subtitle }]} 
            numberOfLines={1}
            ellipsizeMode="tail"
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
    backgroundColor: colors.card, // Base background for gradient overlay
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80, // Absolute minimum for very small screens
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
    backgroundColor: createColorWithOpacity(colors.text, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.text, 0.2),
  },
  statTextContainer: {
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  statTitle: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  statValue: {
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  statSubtitle: {
    color: colors.text,
    opacity: 0.9,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '600',
  },
});

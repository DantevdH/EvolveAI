// Week Navigation Component - Navigate between weeks
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { WeekNavigationProps } from '../../types/training';

const WeekNavigation: React.FC<WeekNavigationProps> = ({
  weekNavigation,
  onWeekChange
}) => {
  const { currentWeek, totalWeeks, canGoBack, canGoForward } = weekNavigation;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canGoBack && styles.buttonDisabled]}
        onPress={() => canGoBack && onWeekChange(currentWeek - 1)}
        disabled={!canGoBack}
      >
        <Ionicons 
          name="chevron-back" 
          size={20} 
          color={canGoBack ? colors.text : colors.border} 
        />
      </TouchableOpacity>

      <View style={styles.weekInfo}>
        <Text style={styles.weekText}>Week {currentWeek}</Text>
        <Text style={styles.totalWeeksText}>of {totalWeeks}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, !canGoForward && styles.buttonDisabled]}
        onPress={() => canGoForward && onWeekChange(currentWeek + 1)}
        disabled={!canGoForward}
      >
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={canGoForward ? colors.text : colors.border} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.buttonSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled
  },
  weekInfo: {
    alignItems: 'center'
  },
  weekText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  totalWeeksText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  }
});

export default WeekNavigation;

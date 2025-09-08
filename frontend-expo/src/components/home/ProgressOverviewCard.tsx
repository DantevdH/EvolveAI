/**
 * Progress Overview Card Component - 7 animated progress bars
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/colors';

interface ProgressOverviewCardProps {
  onViewAll?: () => void;
}

export const ProgressOverviewCard: React.FC<ProgressOverviewCardProps> = ({
  onViewAll,
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const generateRandomHeight = () => {
    return Math.random() * 30 + 30; // Random height between 30-60
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress Overview</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressBars}>
        {Array.from({ length: 7 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              {
                height: animate ? generateRandomHeight() : 20,
                backgroundColor: animate 
                  ? `${colors.primary}70` 
                  : `${colors.primary}30`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  progressBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 60,
  },
  progressBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 20,
  },
});

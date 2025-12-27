/**
 * Recovery View Component - Displays recovery status and muscle group information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { useInsights } from '../../../context/InsightsContext';
import { RecoverySection } from '../RecoverySection';
import { ACWRExplanation } from '../ACWRExplanation';

export const RecoveryView: React.FC = () => {
  const { insightsData } = useInsights();

  return (
    <View style={styles.container}>
      {/* Section Header with Gradient */}
      <LinearGradient
        colors={[
          createColorWithOpacity(colors.secondary, 0.08),
          createColorWithOpacity(colors.secondary, 0.03),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Recovery Status</Text>
              <ACWRExplanation />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Recovery Section */}
      <View style={styles.content}>
        <RecoverySection
          muscleRecoveryStatus={insightsData.muscleRecoveryStatus}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  headerGradient: {
    // Gradient background
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  headerContent: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
});


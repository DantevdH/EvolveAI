/**
 * Insights Content Component - Switches between Performance and Recovery views
 */

import React, { useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { colors } from '@/src/constants/colors';
import { ViewSwitcher, InsightsView } from './ViewSwitcher';
import { PerformanceView } from './PerformanceView';
import { RecoveryView } from './RecoveryView';

interface InsightsContentProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export const InsightsContent: React.FC<InsightsContentProps> = ({
  refreshing,
  onRefresh,
}) => {
  const [selectedView, setSelectedView] = useState<InsightsView>('performance');

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* View Switcher */}
      <ViewSwitcher
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />

      {/* Conditional View Rendering */}
      {selectedView === 'performance' ? (
        <PerformanceView />
      ) : (
        <RecoveryView />
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bottomSpacing: {
    height: 20,
  },
});

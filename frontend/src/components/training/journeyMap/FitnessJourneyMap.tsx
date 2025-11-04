/**
 * Fitness Journey Map Component
 * Main orchestrator component for the journey map view
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { colors } from '../../../constants/colors';
import { TrainingPlan } from '../../../types/training';
import JourneyMapHeader from './JourneyMapHeader';
import CurvedRoadPath from './CurvedRoadPath';
import WeekNode from './WeekNode';
import WeekDetailModal from './WeekDetailModal';
import { WeekNodeData, WeekModalData } from './types';
import { calculateWeekStats } from './utils';
import { generateCurvedPath } from './pathGenerator';
import { useWeekNodeAnimations } from './WeekNodeAnimations';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FitnessJourneyMapProps {
  trainingPlan: TrainingPlan;
  currentWeek: number;
  onWeekSelect: (weekNumber: number) => void;
}

const FitnessJourneyMap: React.FC<FitnessJourneyMapProps> = ({
  trainingPlan,
  currentWeek,
  onWeekSelect,
}) => {
  const [weekNodes, setWeekNodes] = useState<WeekNodeData[]>([]);
  const [selectedWeekModal, setSelectedWeekModal] = useState<WeekModalData | null>(null);
  const [curvedPath, setCurvedPath] = useState<string>('');
  
  // Animations for current week node
  const animations = useWeekNodeAnimations();

  // Generate curved road path and week positions
  useEffect(() => {
    if (!trainingPlan || !trainingPlan.weeklySchedules) return;

    const numWeeks = trainingPlan.totalWeeks;
    const { pathData, nodePositions } = generateCurvedPath(numWeeks);
    
    // Build week nodes with statistics
    const nodes: WeekNodeData[] = nodePositions.map((position, index) => {
      const weekNumber = index + 1;
      const weekSchedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === weekNumber);
      
      if (!weekSchedule) {
        return {
          weekNumber,
          x: position.x,
          y: position.y,
          status: 'locked' as const,
          stars: 0,
          completionPercentage: 0,
        };
      }

      const stats = calculateWeekStats(weekSchedule);
      
      // Determine week status
      let status: 'completed' | 'current' | 'locked';
      if (weekNumber < currentWeek) {
        status = 'completed';
      } else if (weekNumber === currentWeek) {
        status = 'current';
      } else {
        status = 'locked';
      }
      
      return {
        weekNumber,
        x: position.x,
        y: position.y,
        status,
        stars: status === 'completed' ? stats.stars : 0,
        completionPercentage: stats.completionPercentage,
      };
    });
    
    setCurvedPath(pathData);
    setWeekNodes(nodes);
  }, [trainingPlan, currentWeek]);

  // Handle week node press
  const handleWeekPress = (node: WeekNodeData) => {
    const weekSchedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === node.weekNumber);
    if (!weekSchedule) return;
    
    const stats = calculateWeekStats(weekSchedule);
    
    setSelectedWeekModal({
      weekNumber: node.weekNumber,
      status: node.status,
      stars: node.stars,
      completionPercentage: stats.completionPercentage,
      completedWorkouts: stats.completedWorkouts,
      totalWorkouts: stats.totalWorkouts,
    });
  };

  // Close modal and navigate to week
  const handleViewWeek = () => {
    if (selectedWeekModal) {
      onWeekSelect(selectedWeekModal.weekNumber);
      setSelectedWeekModal(null);
    }
  };

  // Calculate header stats
  const totalStars = weekNodes
    .filter(node => node.status === 'completed')
    .reduce((sum, node) => sum + node.stars, 0);
  const completedWeeks = weekNodes.filter(node => node.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <JourneyMapHeader
        trainingPlan={trainingPlan}
        currentWeek={currentWeek}
        completedWeeks={completedWeeks}
        totalStars={totalStars}
      />

      {/* Scrollable Map */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapContainer}>
          {/* Curved Road Path */}
          <CurvedRoadPath
            pathData={curvedPath}
            height={weekNodes.length * 160 + 200}
            width={SCREEN_WIDTH}
          />

          {/* Week Nodes */}
          {weekNodes.map((node) => (
            <WeekNode
              key={node.weekNumber}
              node={node}
              onPress={handleWeekPress}
              animations={node.status === 'current' ? animations : undefined}
            />
          ))}
        </View>
      </ScrollView>

      {/* Week Detail Modal */}
      <WeekDetailModal
        data={selectedWeekModal}
        visible={selectedWeekModal !== null}
        onClose={() => setSelectedWeekModal(null)}
        onViewWeek={handleViewWeek}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mapContainer: {
    position: 'relative',
    minHeight: SCREEN_HEIGHT * 2,
  },
});

export default FitnessJourneyMap;


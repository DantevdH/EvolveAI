/**
 * Fitness Journey Map Component
 * Main orchestrator component for the journey map view
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { colors } from '../../../constants/colors';
import { TrainingPlan } from '../../../types/training';
import JourneyCardContainer from './JourneyCardContainer';
import CurvedRoadPath from './CurvedRoadPath';
import WeekNode from './WeekNode';
import WeekDetailModal from './WeekDetailModal';
import LightningExplosion from './LightningExplosion';
import { WeekNodeData, WeekModalData } from './types';
import { calculateWeekStats } from './utils';
import { generateCurvedPath, PathSegment } from './pathGenerator';
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
  const [roadSegments, setRoadSegments] = useState<Array<{ segment: PathSegment; status: 'completed' | 'current' | 'locked' }>>([]);
  const [lightningExplosion, setLightningExplosion] = useState<boolean>(false);
  
  // Animations for current week node
  const animations = useWeekNodeAnimations();

  // Generate curved road path and week positions
  useEffect(() => {
    if (!trainingPlan || !trainingPlan.weeklySchedules) return;

    const numWeeks = trainingPlan.totalWeeks;
    const { segments, nodePositions } = generateCurvedPath(numWeeks);
    
    // Build week nodes with statistics and road segments
    const nodes: WeekNodeData[] = [];
    const segmentsWithStatus: Array<{ segment: PathSegment; status: 'completed' | 'current' | 'locked' }> = [];
    
    nodePositions.forEach((position, index) => {
      const weekNumber = index + 1;
      const weekSchedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === weekNumber);
      
      // Determine week status
      let status: 'completed' | 'current' | 'locked';
      if (weekNumber < currentWeek) {
        status = 'completed';
      } else if (weekNumber === currentWeek) {
        status = 'current';
      } else {
        status = 'locked';
      }

      if (!weekSchedule) {
        nodes.push({
          weekNumber,
          x: position.x,
          y: position.y,
          status: 'locked' as const,
          stars: 0,
          completionPercentage: 0,
        });
        segmentsWithStatus.push({
          segment: segments[index],
          status: 'locked',
        });
        return;
      }

      const stats = calculateWeekStats(weekSchedule);
      
      nodes.push({
        weekNumber,
        x: position.x,
        y: position.y,
        status,
        stars: status === 'completed' ? stats.stars : 0,
        completionPercentage: stats.completionPercentage,
      });

      segmentsWithStatus.push({
        segment: segments[index],
        status,
      });
    });
    
    setWeekNodes(nodes);
    setRoadSegments(segmentsWithStatus);
  }, [trainingPlan, currentWeek]);

  // Handle week node press
  const handleWeekPress = (node: WeekNodeData) => {
    // If it's the current week, show lightning explosion and navigate directly
    if (node.status === 'current') {
      setLightningExplosion(true);
      // Navigate after a short delay to show animation
      setTimeout(() => {
        onWeekSelect(node.weekNumber);
      }, 500);
      return;
    }

    // For other weeks, show the modal as before
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

  // Stable callback for animation complete
  const handleAnimationComplete = useCallback(() => {
    setLightningExplosion(false);
  }, []);

  // Note: completedWeeks and totalStars are calculated but no longer used in header
  // Keeping for potential future use

  const mapHeight = weekNodes.length * 105 + 150; // Adjusted for new segment height (105px)

  return (
    <View style={styles.container}>
      {/* Journey Card Container with Header */}
      <JourneyCardContainer title={trainingPlan?.title || 'YOUR JOURNEY'}>
      {/* Scrollable Map */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapContainer}>
            {/* Main Road Path */}
          <CurvedRoadPath
            segments={roadSegments}
              height={mapHeight}
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
      </JourneyCardContainer>

      {/* Lightning Explosion Animation */}
      <LightningExplosion
        visible={lightningExplosion}
        onAnimationComplete={handleAnimationComplete}
      />

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
    minHeight: 0, // Important for flex children to shrink
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
    paddingTop: 12,
  },
  mapContainer: {
    position: 'relative',
    minHeight: SCREEN_HEIGHT * 1.5,
  },
});

export default FitnessJourneyMap;


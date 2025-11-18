/**
 * Fitness Journey Map Component
 * Main orchestrator component for the journey map view
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { TrainingPlan } from '../../../types/training';
import { useAuth } from '../../../context/AuthContext';
import JourneyCardContainer from './JourneyCardContainer';
import CurvedRoadPath from './CurvedRoadPath';
import WeekNode from './WeekNode';
import WeekDetailModal from './WeekDetailModal';
import { WeekNodeData, WeekModalData } from './types';
import { calculateWeekStats } from './utils';
import { generateCurvedPath, PathSegment } from './pathGenerator';
import { useWeekNodeAnimations } from './WeekNodeAnimations';
import { getWeekStatus, isWeekPast, isWeekUnlocked } from '../../../utils/trainingDateUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Calculate actual content width for proper centering
// JourneyCardContainer has marginHorizontal: 16, content has paddingHorizontal: 20
const CARD_MARGIN_HORIZONTAL = 16 * 2; // left + right
const CONTENT_PADDING_HORIZONTAL = 20 * 2; // left + right
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_MARGIN_HORIZONTAL - CONTENT_PADDING_HORIZONTAL;

interface FitnessJourneyMapProps {
  trainingPlan: TrainingPlan;
  currentWeek: number;
  onWeekSelect: (weekNumber: number) => void;
  onGenerateWeek?: (weekNumber: number) => Promise<void>;
  headerTitle?: string;
  headerAccessory?: React.ReactNode;
}

const FitnessJourneyMap: React.FC<FitnessJourneyMapProps> = ({
  trainingPlan,
  currentWeek,
  onWeekSelect,
  onGenerateWeek,
  headerTitle,
  headerAccessory,
}) => {
  const { state: authState } = useAuth();
  const [weekNodes, setWeekNodes] = useState<WeekNodeData[]>([]);
  const [selectedWeekModal, setSelectedWeekModal] = useState<WeekModalData | null>(null);
  const [roadSegments, setRoadSegments] = useState<Array<{ segment: PathSegment; status: 'completed' | 'current' | 'locked' }>>([]);
  
  // Animations for current week node
  const animations = useWeekNodeAnimations();

  // Determine if we're still generating the plan (polling for more weeks)
  const weekCount = trainingPlan?.weeklySchedules?.length || 0;
  
  // Expected total weeks for a complete plan (backend generates 12+ weeks)
  const EXPECTED_TOTAL_WEEKS = 12;
  
  // Plan is still generating if:
  // 1. Auth state says we're polling, OR
  // 2. We only have week 1 (fallback for backwards compatibility)
  const isGenerating = authState.isPollingPlan || weekCount === 1;

  // Generate curved road path and week positions
  useEffect(() => {
    if (!trainingPlan || !trainingPlan.weeklySchedules) return;

    // PROGRESSIVE LOADING LOGIC:
    // Always show all available weeks (typically Week 1 immediately after generation)
    // The loading indicator communicates that more weeks are coming
    const availableWeeks = trainingPlan.weeklySchedules?.length || 0;
    const numWeeks = availableWeeks || 1; // Ensure at least week 1 renders
    
    const { segments, nodePositions } = generateCurvedPath(numWeeks, { containerWidth: CONTENT_WIDTH });
    
    // Build week nodes with statistics and road segments
    const nodes: WeekNodeData[] = [];
    const segmentsWithStatus: Array<{ segment: PathSegment; status: 'completed' | 'current' | 'locked' }> = [];
    
    // Build week nodes
    nodePositions.forEach((position, index) => {
      const weekNumber = index + 1;
      const weekSchedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === weekNumber);
      
      // Use date-based status to determine if week should be clickable
      const weekStatus = getWeekStatus(weekNumber, trainingPlan);
      
      // Determine visual status for display (simplified for UI)
      let status: 'completed' | 'current' | 'locked';
      if (weekStatus === 'completed') {
        status = 'completed';
      } else if (weekStatus === 'current') {
        status = 'current';
      } else {
        // All other statuses (unlocked-not-generated, past-not-generated, future-locked, generated) show as locked visually
        status = 'locked';
      }

      // Determine if week should be clickable
      // Clickable: completed, current, unlocked-not-generated, generated (future weeks that exist)
      // Not clickable: past-not-generated, future-locked
      const isClickable = weekStatus !== 'past-not-generated' && weekStatus !== 'future-locked';

      // For non-generated weeks, we still want to show them but they may be clickable if unlocked
      const stats = weekSchedule ? calculateWeekStats(weekSchedule) : {
        completionPercentage: 0,
        completedWorkouts: 0,
        totalWorkouts: 0,
        stars: 0,
      };
      
      nodes.push({
        weekNumber,
        x: position.x,
        y: position.y,
        status,
        stars: status === 'completed' ? stats.stars : 0,
        completionPercentage: stats.completionPercentage,
        focusTheme: weekSchedule?.focusTheme,
        primaryGoal: weekSchedule?.primaryGoal,
        progressionLever: weekSchedule?.progressionLever,
        isClickable,
      });
    });

    // Map segments (connections between nodes)
    // Each segment connects week i to week i+1
    segments.forEach((segment, segmentIndex) => {
      // Determine which weeks this segment connects
      const fromWeekNumber = segment.weekNumber;
      const toWeekNumber = fromWeekNumber + 1;
      
      // Determine status of both weeks
      const fromWeekStatus: 'completed' | 'current' | 'locked' = 
        fromWeekNumber < currentWeek ? 'completed' :
        fromWeekNumber === currentWeek ? 'current' :
        'locked';
      
      const toWeekStatus: 'completed' | 'current' | 'locked' = 
        toWeekNumber < currentWeek ? 'completed' :
        toWeekNumber === currentWeek ? 'current' :
        'locked';
      
      // Connection is golden only if both weeks are unlocked (completed or current)
      // Otherwise it's locked (gray)
      let status: 'completed' | 'current' | 'locked';
      if (fromWeekStatus === 'locked' || toWeekStatus === 'locked') {
        status = 'locked';
      } else if (fromWeekStatus === 'current' || toWeekStatus === 'current') {
        status = 'current';
      } else {
        status = 'completed';
      }

      segmentsWithStatus.push({
        segment,
        status,
      });
    });
    
    setWeekNodes(nodes);
    setRoadSegments(segmentsWithStatus);
  }, [trainingPlan, currentWeek, weekCount, isGenerating]);

  // Handle week node press
  const handleWeekPress = (node: WeekNodeData) => {
    // Always show the modal - no direct navigation
    const weekSchedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === node.weekNumber);
    const weekStatus = getWeekStatus(node.weekNumber, trainingPlan);
    const isPast = isWeekPast(node.weekNumber, trainingPlan);
    const isUnlocked = isWeekUnlocked(node.weekNumber, trainingPlan);
    const isGenerated = !!weekSchedule;
    
    // Calculate stats if week exists
    const stats = weekSchedule ? calculateWeekStats(weekSchedule) : {
      completionPercentage: 0,
      completedWorkouts: 0,
      totalWorkouts: 0,
      stars: 0,
    };
    
    setSelectedWeekModal({
      weekNumber: node.weekNumber,
      status: weekStatus,
      stars: stats.stars,
      completionPercentage: stats.completionPercentage,
      completedWorkouts: stats.completedWorkouts,
      totalWorkouts: stats.totalWorkouts,
      focusTheme: weekSchedule?.focusTheme,
      primaryGoal: weekSchedule?.primaryGoal,
      progressionLever: weekSchedule?.progressionLever,
      isUnlocked,
      isGenerated,
      isPastWeek: isPast,
    });
  };

  // Close modal and navigate to week
  const handleViewWeek = () => {
    if (selectedWeekModal) {
      onWeekSelect(selectedWeekModal.weekNumber);
      setSelectedWeekModal(null);
    }
  };

  // Calculate progress stats
  const completedCount = weekNodes.filter(n => n.status === 'completed').length;
  const totalWeeks = isGenerating ? EXPECTED_TOTAL_WEEKS : (trainingPlan?.totalWeeks || weekNodes.length || EXPECTED_TOTAL_WEEKS);
  const progressPercentage = totalWeeks > 0 ? Math.round((completedCount / totalWeeks) * 100) : 0;

  // Get Week 1 node - either from weekNodes (if already built) or create it directly from trainingPlan
  const week1NodeFromState = weekNodes.find(n => n.weekNumber === 1);
  
  // If weekNodes is empty but we have trainingPlan with Week 1, create the node directly
  let week1Node = week1NodeFromState;
  if (!week1Node && trainingPlan?.weeklySchedules && weekCount >= 1) {
    const week1Schedule = trainingPlan.weeklySchedules.find(w => w.weekNumber === 1);
    if (week1Schedule) {
      // Generate position from path (will be consistent since we use same logic in useEffect)
      const { nodePositions } = generateCurvedPath(weekCount, { containerWidth: CONTENT_WIDTH });
      const position = nodePositions[0] || { x: CONTENT_WIDTH / 2, y: 60 };
      
      // Calculate stats
      const stats = calculateWeekStats(week1Schedule);
      
      // Determine status
      const status: 'completed' | 'current' | 'locked' = 
        1 < currentWeek ? 'completed' : 
        1 === currentWeek ? 'current' : 
        'locked';
      
      // Create Week 1 node
      week1Node = {
        weekNumber: 1,
        x: position.x,
        y: position.y,
        status,
        stars: status === 'completed' ? stats.stars : 0,
        completionPercentage: stats.completionPercentage,
        focusTheme: week1Schedule.focusTheme,
      };
    }
  }

  // Calculate mapHeight based on actual pathGenerator spacing
  // PathGenerator uses: startY = 60, availableHeight = 1600
  // Last week position = startY + availableHeight = 1660
  // We need: last week y + card height + bottom padding
  const CARD_HEIGHT = 65; // WeekNode card height
  const BOTTOM_PADDING = 120; // Extra padding for last card visibility
  const calculateMapHeight = (numWeeks: number): number => {
    if (numWeeks <= 1) {
      // For single week: startY + card height + padding for loader
      return 60 + CARD_HEIGHT + 200; // ~325px
    }
    // For multiple weeks: last week y position + card height + padding
    // Last week is at: startY (60) + availableHeight (1600) = 1660
    return 1660 + CARD_HEIGHT / 2 + BOTTOM_PADDING; // ~1753px for 12 weeks
  };
  
  // Use actual weekCount, not weekNodes.length (which might be stale)
  const mapHeight = calculateMapHeight(weekCount);

  // SIMPLIFIED LOGIC: Show only loader if we have <= 1 week
  const showOnlyLoader = weekCount <= 1;
  return (
    <View style={styles.container}>
      {/* Journey Card Container with Header */}
      <JourneyCardContainer
        title={headerTitle || trainingPlan?.title || 'YOUR JOURNEY'}
        headerAccessory={headerAccessory}
      >
      {/* Always use the same layout structure - just show loader when generating */}
      
      {/* Progress Header Strip - hide when only showing loader */}
      {!showOnlyLoader && (
      <View style={styles.progressHeaderContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Week {currentWeek} of {totalWeeks}</Text>
          <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
      </View>
      )}
      
      {/* Scrollable Map - same structure for both loader and full view */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mapContainer, { minHeight: mapHeight }]}>
          {/* Main Road Path - only show when not in loader mode */}
          {!showOnlyLoader && (
          <CurvedRoadPath
            segments={roadSegments}
              height={mapHeight}
            width={CONTENT_WIDTH}
          />
          )}

          {/* Week Nodes - render all available nodes */}
          {weekNodes.map((node) => (
            <WeekNode
              key={node.weekNumber}
              node={node}
              onPress={handleWeekPress}
              animations={node.status === 'current' ? animations : undefined}
              totalWeeks={weekNodes.length}
            />
          ))}

          {/* Loading indicator below week 1 while plan is being generated */}
          {isGenerating && week1Node && (
            <View
              style={[
                styles.loadingContainer,
                {
                  left: week1Node.x - 110, // Center horizontally (width/2)
                  top: week1Node.y + 65 / 2 + 40, // Below week 1 card
                },
              ]}
            >
              <LoadingDots />
              <Text style={styles.loadingText}>Gathering the upcoming weeks...</Text>
            </View>
          )}
        </View>
      </ScrollView>
      </JourneyCardContainer>

      {/* Week Detail Modal */}
      <WeekDetailModal
        data={selectedWeekModal}
        visible={selectedWeekModal !== null}
        onClose={() => setSelectedWeekModal(null)}
        onViewWeek={handleViewWeek}
        onGenerateWeek={selectedWeekModal && onGenerateWeek ? async () => {
          if (selectedWeekModal) {
            await onGenerateWeek(selectedWeekModal.weekNumber);
            // Refresh the training plan - this will be handled by the parent component
          }
        } : undefined}
      />
    </View>
  );
};

/**
 * Loading Dots Component
 * Shows three animated dots while plan is being generated
 */
const LoadingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [dot1, dot2, dot3]);

  const getDotOpacity = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });
  };

  const getDotScale = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.2],
    });
  };

  return (
    <View style={loadingDotsStyles.container}>
      <Animated.View
        style={[
          loadingDotsStyles.dot,
          {
            opacity: getDotOpacity(dot1),
            transform: [{ scale: getDotScale(dot1) }],
          },
        ]}
      />
      <Animated.View
        style={[
          loadingDotsStyles.dot,
          {
            opacity: getDotOpacity(dot2),
            transform: [{ scale: getDotScale(dot2) }],
          },
        ]}
      />
      <Animated.View
        style={[
          loadingDotsStyles.dot,
          {
            opacity: getDotOpacity(dot3),
            transform: [{ scale: getDotScale(dot3) }],
          },
        ]}
      />
    </View>
  );
};

const loadingDotsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.7),
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 0, // Important for flex children to shrink
  },
  progressHeaderContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 20,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: createColorWithOpacity(colors.secondary, 0.8),
    letterSpacing: 0.4,
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 999,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.1),
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.1),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: 24,
  },
  mapContainer: {
    position: 'relative',
    // minHeight is set dynamically based on weekCount to ensure all weeks are visible
    paddingVertical: 8,
  },
  loadingContainer: {
    position: 'absolute',
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: createColorWithOpacity(colors.card, 0.95),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
    color: createColorWithOpacity(colors.secondary, 0.8),
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default FitnessJourneyMap;


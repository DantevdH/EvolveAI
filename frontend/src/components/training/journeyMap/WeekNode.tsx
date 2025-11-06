/**
 * Week Node Component
 * Renders individual week nodes with status, stars, and animations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { WeekNodeData } from './types';
import { WeekNodeAnimations } from './WeekNodeAnimations';

interface WeekNodeProps {
  node: WeekNodeData;
  onPress: (node: WeekNodeData) => void;
  animations?: WeekNodeAnimations;
}

const WeekNode: React.FC<WeekNodeProps> = ({ node, onPress, animations }) => {
  const isCurrentWeek = node.status === 'current';
  
  // Node colors based on status
  const nodeColor = 
    node.status === 'completed' ? colors.tertiary :
    node.status === 'current' ? colors.primary :
    colors.muted;
  
  // Node size increased to 50px for better visibility
  const nodeSize = 50;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          left: node.x - nodeSize / 2,
          top: node.y - nodeSize / 2,
          width: nodeSize,
          height: nodeSize,
          backgroundColor: nodeColor,
        },
      ]}
      onPress={() => onPress(node)}
      activeOpacity={0.7}
    >
      <View style={[styles.inner, { borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.7)' }]}>
        {/* Subtle glow effect for current week */}
        {isCurrentWeek && animations && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: animations.glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.5],
                }),
              },
            ]}
          />
        )}
        
        <Text style={styles.weekNumber}>{node.weekNumber}</Text>
        
        {/* Badge for current week */}
        {isCurrentWeek && (
          <View style={styles.currentBadge}>
            <Ionicons name="flash" size={12} color={colors.text} />
          </View>
        )}
        
        {/* Lock icon for locked weeks */}
        {node.status === 'locked' && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={14} color={colors.text} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure nodes render on top of path
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  glow: {
    position: 'absolute',
    width: '130%',
    height: '130%',
    borderRadius: 50,
    backgroundColor: colors.primary,
  },
  weekNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  currentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.warning,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    opacity: 0.7,
  },
});

export default WeekNode;


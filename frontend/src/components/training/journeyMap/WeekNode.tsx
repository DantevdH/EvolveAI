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
  
  const nodeSize = isCurrentWeek ? 65 : 60;

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
      <View style={styles.inner}>
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
        
        {/* Stars for completed weeks */}
        {node.status === 'completed' && node.stars > 0 && (
          <View style={styles.stars}>
            {[...Array(node.stars)].map((_, i) => (
              <Ionicons key={i} name="star" size={10} color={colors.warning} />
            ))}
          </View>
        )}
        
        {/* Badge for current week */}
        {isCurrentWeek && (
          <View style={styles.currentBadge}>
            <Ionicons name="flash" size={16} color={colors.text} />
          </View>
        )}
        
        {/* Lock icon for locked weeks */}
        {node.status === 'locked' && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={20} color={colors.text} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 2,
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
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


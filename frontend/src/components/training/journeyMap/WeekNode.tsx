/**
 * Week Node Component
 * Renders individual week nodes with status, stars, and animations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { WeekNodeData } from './types';
import { WeekNodeAnimations } from './WeekNodeAnimations';

interface WeekNodeProps {
  node: WeekNodeData;
  onPress: (node: WeekNodeData) => void;
  animations?: WeekNodeAnimations;
}

const STATUS_NODE_STYLE = {
  completed: {
    background: createColorWithOpacity(colors.secondary, 0.9),
    text: colors.card,
    border: createColorWithOpacity(colors.card, 0.65),
  },
  current: {
    background: colors.primary,
    text: colors.card,
    border: createColorWithOpacity(colors.card, 0.65),
  },
  locked: {
    background: createColorWithOpacity(colors.text, 0.1),
    text: createColorWithOpacity(colors.text, 0.55),
    border: createColorWithOpacity(colors.text, 0.12),
  },
};

const WeekNode: React.FC<WeekNodeProps> = ({ node, onPress, animations }) => {
  const isCurrentWeek = node.status === 'current';
  const statusStyle = STATUS_NODE_STYLE[node.status];
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
          backgroundColor: statusStyle.background,
        },
      ]}
      onPress={() => onPress(node)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.inner,
          {
            borderWidth: node.status === 'locked' ? 1 : 1.5,
            borderColor: statusStyle.border,
          },
        ]}
      >
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

        <Text style={[styles.weekNumber, { color: statusStyle.text }]}>{node.weekNumber}</Text>

        {isCurrentWeek && (
          <View style={[styles.currentBadge, { backgroundColor: createColorWithOpacity(colors.secondary, 0.25) }] }>
            <Ionicons name="flash" size={12} color={colors.primary} />
          </View>
        )}

        {node.status === 'locked' && (
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={14} color={createColorWithOpacity(colors.text, 0.6)} />
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
    zIndex: 10,
    shadowColor: createColorWithOpacity(colors.tertiary, 0.14),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
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
  },
  currentBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
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


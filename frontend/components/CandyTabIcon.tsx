/**
 * Candy Crush Style Tab Button Component
 * Individual rounded buttons with icons that pop out above
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '@/src/constants/colors';

interface CandyTabIconProps {
  focused: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string; // Main color for this button
  gradientColors: [string, string]; // Gradient for the button
}

export const CandyTabIcon: React.FC<CandyTabIconProps> = ({ 
  focused, 
  label, 
  icon, 
  color,
  gradientColors
}) => {
  // Inactive buttons use solid light colors (fully opaque, not transparent)
  const inactiveColor = '#F5F5F5'; // Solid light gray - fully opaque
  const inactiveGradient: [string, string] = [
    colors.card, // Solid white card color - fully opaque
    '#FAFAFA' // Slightly off-white - fully opaque
  ];
  const activeLabelColor = '#FFFFFF';
  const inactiveLabelColor = createColorWithOpacity(colors.secondary, 0.9); // Golden text when inactive

  const iconColor = focused ? '#FFFFFF' : createColorWithOpacity(colors.secondary, 0.9); // Darker golden icon when inactive

  
  // Active buttons always use golden color
  const activeColor = colors.secondary; // Always use golden when focused
  const activeGradient: [string, string] = [createColorWithOpacity(colors.secondary, 0.9), createColorWithOpacity(colors.secondary, 0.7)];
  
  return (
    <View style={styles.container}>
      {/* Icon that pops out above the button */}
      <View style={[styles.iconBubble, { 
        backgroundColor: focused ? activeColor : inactiveColor,
        transform: [{ scale: focused ? 1.05 : 1 }],
        borderWidth: 2,
        borderColor: focused ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
        opacity: 1, // Always fully opaque - never transparent
      }]}>
        <Ionicons 
          name={icon} 
          size={32} 
          color={iconColor}
        />
      </View>
      
      {/* Button body */}
      <LinearGradient
        colors={focused ? activeGradient : inactiveGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.button, {
          opacity: 1, // Always fully opaque - no transparency on clickable items
        }]}
      >
        <Text 
          style={[styles.label, {
            color: focused ? activeLabelColor : inactiveLabelColor,
          }]} 
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%', // Take full width of parent, let parent handle spacing
    height: 80,
    marginBottom: 8,
    overflow: 'visible', // Allow icons to extend beyond container
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  button: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    paddingTop: 26,
    // Shadow for button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default CandyTabIcon;



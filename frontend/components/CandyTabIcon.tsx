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
  // Inactive buttons use primary color with reduced opacity (not grey to avoid looking disabled)
  const inactiveColor = createColorWithOpacity(colors.primary, 0.4); // Primary color at 40% opacity
  const inactiveGradient: [string, string] = [
    createColorWithOpacity(colors.primary, 0.4), 
    createColorWithOpacity(colors.primary, 0.4)
  ]; // Primary gradient with opacity for inactive
  
  // Active buttons always use primary color at full opacity
  const activeColor = colors.primary; // Always use primary color when focused
  const activeGradient: [string, string] = [colors.primary, '#6B1A1A']; // Darker red gradient
  
  return (
    <View style={styles.container}>
      {/* Icon that pops out above the button */}
      <View style={[styles.iconBubble, { 
        backgroundColor: focused ? activeColor : inactiveColor,
        transform: [{ scale: focused ? 1.1 : 1 }],
        borderWidth: focused ? 4 : 3,
        borderColor: focused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
      }]}>
        <Ionicons 
          name={icon} 
          size={32} 
          color={colors.text} 
        />
      </View>
      
      {/* Button body */}
      <LinearGradient
        colors={focused ? activeGradient : inactiveGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.button, {
          opacity: focused ? 1 : 0.7,
        }]}
      >
        <Text 
          style={[styles.label, {
            color: focused ? colors.text : 'rgba(255, 255, 255, 0.8)',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 10,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingTop: 28,
    // Shadow for button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default CandyTabIcon;



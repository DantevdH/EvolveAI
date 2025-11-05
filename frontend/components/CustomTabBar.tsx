/**
 * Custom Tab Bar Component
 * Fully custom implementation to remove all default indicators and UI elements
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CandyTabIcon from './CandyTabIcon';
import { colors } from '@/src/constants/colors';
import * as Haptics from 'expo-haptics';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 12;
  // Height accounts for icons extending above (icon is 56px, positioned at top: 0)
  const totalHeight = Platform.OS === 'ios' ? 110 + bottomPadding - 20 : 96;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding, height: totalHeight }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }

          // Haptic feedback
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get icon and label configuration
        let icon = 'circle';
        let label = route.name;
        let color = '#FF9800';
        let gradientColors: [string, string] = ['#FFB74D', '#FF6F00'];

        if (route.name === 'index') {
          icon = 'map';
          label = 'Journey';
          color = '#FF9800';
          gradientColors = ['#FFB74D', '#FF6F00'];
        } else if (route.name === 'chat') {
          icon = 'fitness';
          label = 'Coach';
          color = '#16B89F';
          gradientColors = ['#4DD0E1', '#00897B'];
        } else if (route.name === 'insights') {
          icon = 'bulb';
          label = 'Insights';
          color = '#A78BFA';
          gradientColors = ['#B794F4', '#805AD5'];
        } else if (route.name === 'community') {
          icon = 'people';
          label = 'Community';
          color = '#FF9800';
          gradientColors = ['#FFB74D', '#FF6F00'];
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <CandyTabIcon
              focused={isFocused}
              label={label}
              icon={icon as any}
              color={color}
              gradientColors={gradientColors}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.background, // Match app background color
    paddingTop: 0, // No top padding to allow icons to extend fully
    paddingHorizontal: 12,
    // No shadows on container
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    // No borders or rounded corners
    borderTopWidth: 0,
    overflow: 'visible', // Allow icons to extend beyond container
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible', // Allow icons to extend beyond button
    marginHorizontal: 4, // Add horizontal margin for spacing between buttons
  },
});


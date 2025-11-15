/**
 * Floating Tab Bar Component (Option 3)
 * Completely custom floating tab bar that works outside React Navigation
 * This gives you full control over transparency and positioning
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CandyTabIcon from './CandyTabIcon';
import { colors } from '@/src/constants/colors';
import * as Haptics from 'expo-haptics';

interface TabConfig {
  name: string;
  route: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  color: string;
  gradientColors: [string, string];
}

const tabs: TabConfig[] = [
  {
    name: 'Journey',
    route: '/',
    icon: 'map',
    label: 'Journey',
    color: '#FF9800',
    gradientColors: ['#FFB74D', '#FF6F00'],
  },
  {
    name: 'Insights',
    route: '/insights',
    icon: 'bulb',
    label: 'Insights',
    color: '#A78BFA',
    gradientColors: ['#B794F4', '#805AD5'],
  },
  {
    name: 'Profile',
    route: '/profile',
    icon: 'person',
    label: 'Profile',
    color: '#FF9800',
    gradientColors: ['#FFB74D', '#FF6F00'],
  },
];

export default function FloatingTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 10;
  const totalHeight = Platform.OS === 'ios' ? 96 + bottomPadding - 20 : 88;

  const isFocused = (route: string) => {
    // Normalize both paths by removing trailing slashes
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    const normalizedRoute = route.replace(/\/+$/, '') || '/';
    
    // Simple exact match
    return normalizedPathname === normalizedRoute;
  };

  const handlePress = (tab: TabConfig) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(tab.route as any);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          paddingBottom: bottomPadding, 
          height: totalHeight,
        }
      ]}
      pointerEvents="box-none"
    >
      {tabs.map((tab) => {
        const focused = isFocused(tab.route);
        
        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            onPress={() => handlePress(tab)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <CandyTabIcon
              focused={focused}
              label={tab.label}
              icon={tab.icon}
              color={tab.color}
              gradientColors={tab.gradientColors}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'transparent', // Fully transparent
    paddingTop: 0,
    paddingHorizontal: 12,
    borderTopWidth: 0,
    overflow: 'visible',
    zIndex: 1000, // Ensure it's on top
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    marginHorizontal: 4,
  },
});


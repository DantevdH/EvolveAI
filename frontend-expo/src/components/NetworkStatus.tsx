/**
 * Network status component for showing connection state
 * Provides user feedback when network is unavailable
 */

import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';;
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../constants/designSystem';

interface NetworkStatusProps {
  showWhenConnected?: boolean;
  position?: 'top' | 'bottom';
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  showWhenConnected = false,
  position = 'top',
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      
      // Only show if connection status changed
      if (isConnected !== connected) {
        setIsConnected(connected);
        
        // Show notification for disconnection or if showWhenConnected is true
        if (!connected || showWhenConnected) {
          setIsVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        } else {
          // Hide notification when reconnected
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false);
          });
        }
      }
    });

    return () => unsubscribe();
  }, [isConnected, showWhenConnected, fadeAnim]);

  if (!isVisible) return null;

  const isOffline = isConnected === false;
  const backgroundColor = isOffline ? colors.error : colors.success;
  const iconName = isOffline ? 'wifi-off' : 'wifi';
  const message = isOffline ? 'No internet connection' : 'Connected';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          [position]: 0,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={iconName}
          size={16}
          color={colors.text}
          style={styles.icon}
        />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
});

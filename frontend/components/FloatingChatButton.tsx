/**
 * Floating Chat Button Component
 * Draggable floating button that opens a chat modal and snaps to nearest border
 */

import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import ChatModal from './ChatModal';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 56;
const BUTTON_MARGIN = 16;
const SNAP_THRESHOLD = SCREEN_WIDTH / 2; // Snap to left or right based on center

const FloatingChatButton: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Calculate available screen area (excluding safe areas)
  const availableHeight = SCREEN_HEIGHT - insets.top - insets.bottom;
  const availableWidth = SCREEN_WIDTH;
  
  // Initial position: right side, 60% down the screen
  const initialX = availableWidth - BUTTON_SIZE - BUTTON_MARGIN;
  const initialY = insets.top + (availableHeight * 0.6);
  
  const pan = useRef(new Animated.ValueXY({
    x: initialX,
    y: initialY,
  })).current;

  // Track the current position
  const currentPosition = useRef({ x: initialX, y: initialY });
  
  // Track if user dragged (to prevent opening modal on drag)
  const hasDragged = useRef(false);

  const getSnapPosition = (x: number, y: number) => {
    // Determine if button should snap to left or right based on center of button
    const buttonCenterX = x + BUTTON_SIZE / 2;
    const shouldSnapToLeft = buttonCenterX < SNAP_THRESHOLD;
    const snapX = shouldSnapToLeft 
      ? BUTTON_MARGIN 
      : availableWidth - BUTTON_SIZE - BUTTON_MARGIN;
    
    // Constrain Y position within safe bounds
    const minY = insets.top + BUTTON_MARGIN;
    const maxY = SCREEN_HEIGHT - insets.bottom - BUTTON_SIZE - BUTTON_MARGIN - 100; // 100px for tab bar
    const snapY = Math.max(minY, Math.min(maxY, y));
    
    return { x: snapX, y: snapY };
  };

  const panResponder = useRef(
    PanResponder.create({
      // Don't capture taps - only activate on actual drag movement
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only activate PanResponder if user has moved significantly (drag threshold)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // User started dragging - mark as dragged
        hasDragged.current = true;
        // Store the current position before starting drag
        currentPosition.current = {
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        };
        pan.setOffset({
          x: currentPosition.current.x,
          y: currentPosition.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (evt, gestureState) => {
        pan.flattenOffset();
        
        // Calculate the new position after drag
        const newX = currentPosition.current.x + gestureState.dx;
        const newY = currentPosition.current.y + gestureState.dy;
        
        // Update current position
        currentPosition.current = { x: newX, y: newY };
        
        // Calculate snap position
        const snapPosition = getSnapPosition(newX, newY);
        
        // Update current position to snap position
        currentPosition.current = snapPosition;
        
        // Animate to snap position
        Animated.spring(pan, {
          toValue: snapPosition,
          useNativeDriver: false,
          tension: 50,
          friction: 7,
        }).start();
        
        // Reset drag flag after animation completes
        setTimeout(() => {
          hasDragged.current = false;
        }, 300);
        
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
    })
  ).current;

  const handlePress = () => {
    // Only open modal if user didn't drag
    if (!hasDragged.current) {
      setIsModalVisible(true);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.button}
        >
          <LinearGradient
            colors={[createColorWithOpacity(colors.primary, 0.9), createColorWithOpacity(colors.primary, 0.8)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Ionicons name="chatbubble-ellipses" size={28} color={colors.text} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ChatModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    zIndex: 9999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: createColorWithOpacity(colors.primary, 0.3),
  },
});

export default FloatingChatButton;


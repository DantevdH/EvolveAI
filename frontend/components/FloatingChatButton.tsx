/**
 * Floating Chat Button Component
 * Draggable floating button that opens a chat modal and snaps to nearest border
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import ChatModal from './ChatModal';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/src/context/AuthContext';
import {
  registerChatAutoOpenHandler,
  unregisterChatAutoOpenHandler,
} from '@/src/utils/chatAutoOpen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 56;
const BUTTON_MARGIN = 16;
const SNAP_THRESHOLD = SCREEN_WIDTH / 2; // Snap to left or right based on center

const PLAN_REVIEW_SEEN_KEY = 'plan_review_seen_';

const FloatingChatButton: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [hasSeenReview, setHasSeenReview] = useState(false);
  const { state: authState, updateUserProfile, dispatch } = useAuth();
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

  const isPlanReviewNeeded = useMemo(
    () => !!authState.trainingPlan && !authState.userProfile?.planAccepted,
    [authState.trainingPlan, authState.userProfile?.planAccepted]
  );

  const currentPlanId = useMemo(() => {
    return authState.trainingPlan?.id?.toString() || null;
  }, [authState.trainingPlan?.id]);

  const planIntroMessage = useMemo(() => {
    if (!authState.trainingPlan) {
      return undefined;
    }
    const plan = authState.trainingPlan as any;
    return (
      plan?.aiMessage ||
      plan?.ai_message ||
      `Hi ${authState.userProfile?.username || 'there'}! 👋\n\n🎉 Amazing! Here's your personalized plan. Let me know if anything needs tweaking!`
    );
  }, [authState.trainingPlan, authState.userProfile?.username]);

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

  // Check AsyncStorage to see if user has seen the review modal for this plan
  // Note: We track "seen" per plan, but the REAL gate is planAccepted in the DB
  // The storage is just to prevent showing the modal multiple times in the same session
  // before the user accepts or if they reload during onboarding
  useEffect(() => {
    const checkStorage = async () => {
      if (!currentPlanId) {
        setHasCheckedStorage(true);
        return;
      }

      // If plan is already accepted, no need to check storage
      if (!isPlanReviewNeeded) {
        setHasSeenReview(true); // Mark as seen since plan is already accepted
        setHasCheckedStorage(true);
        return;
      }

      try {
        const storageKey = `${PLAN_REVIEW_SEEN_KEY}${currentPlanId}`;
        const seen = await AsyncStorage.getItem(storageKey);
        setHasSeenReview(seen === 'true');
        setHasCheckedStorage(true);
      } catch (error) {
        console.error('Error checking plan review storage:', error);
        // On error, mark as checked anyway to not block the UI
        setHasCheckedStorage(true);
        setHasSeenReview(false); // Default to not seen on error
      }
    };

    checkStorage();
  }, [currentPlanId, isPlanReviewNeeded, authState.userProfile?.planAccepted]);

  // Open modal handler - uses callback to get fresh state
  const openModalIfNeeded = useCallback(async () => {
    // Guard: plan doesn't need review
    if (!isPlanReviewNeeded) {
      return;
    }

    // Guard: storage check not complete yet (async operation in progress)
    if (!hasCheckedStorage) {
      return;
    }

    // Guard: user has already seen this plan's review in this session
    if (hasSeenReview) {
      return;
    }

    // All checks passed - open the modal
    setIsModalVisible(true);
    
    // Mark as seen in AsyncStorage to prevent duplicate opens in this session
    // This flag is temporary and will be cleared when the plan is accepted
    if (currentPlanId) {
      try {
        const storageKey = `${PLAN_REVIEW_SEEN_KEY}${currentPlanId}`;
        await AsyncStorage.setItem(storageKey, 'true');
        setHasSeenReview(true);
      } catch (error) {
        console.error('Error saving plan review seen status:', error);
        // Non-critical error - modal is already open, just log it
      }
    }
  }, [isPlanReviewNeeded, hasCheckedStorage, hasSeenReview, currentPlanId]);

  // Register handler so TrainingScreen can trigger auto-open
  useEffect(() => {
    registerChatAutoOpenHandler(openModalIfNeeded);
    return () => {
      unregisterChatAutoOpenHandler();
    };
  }, [openModalIfNeeded]);

  const handlePlanAccepted = useCallback(async () => {
    if (authState.userProfile?.planAccepted) {
      return;
    }

    const success = await updateUserProfile({ planAccepted: true });

    if (!success && authState.userProfile) {
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          ...authState.userProfile,
          planAccepted: true,
        },
      });
    }
  }, [authState.userProfile, updateUserProfile, dispatch]);

  const handlePress = () => {
    // Only open modal if user didn't drag
    if (!hasDragged.current) {
      setIsModalVisible(true);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const handleModalClose = useCallback(async () => {
    setIsModalVisible(false);
    
    if (isPlanReviewNeeded) {
      // Update plan acceptance in database and context
      await handlePlanAccepted();
      
      // Clear the temporary storage flag since plan is now accepted
      // The real source of truth is planAccepted in the database
      if (currentPlanId) {
        try {
          const storageKey = `${PLAN_REVIEW_SEEN_KEY}${currentPlanId}`;
          await AsyncStorage.removeItem(storageKey);
        } catch (error) {
          console.error('Error clearing storage flag:', error);
          // Non-critical error - plan is already accepted in DB
        }
      }
    }
  }, [handlePlanAccepted, isPlanReviewNeeded, currentPlanId]);

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
            colors={[colors.background, colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ChatModal
        visible={isModalVisible}
        onClose={handleModalClose}
        mode={isPlanReviewNeeded ? 'plan-review' : 'general'}
        initialMessage={isPlanReviewNeeded ? planIntroMessage : undefined}
        onPlanAccepted={handlePlanAccepted}
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
    shadowColor: createColorWithOpacity(colors.primary, 0.2),
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
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.primary, 0.25),
  },
});

export default FloatingChatButton;


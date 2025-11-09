/**
 * Lightning Explosion Animation Component
 * Creates a cool exploding lightning bolt effect when clicking the current week
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Modal, useWindowDimensions, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '../../../constants/colors';

interface LightningExplosionProps {
  visible: boolean;
  onAnimationComplete: () => void;
}

const LightningExplosion: React.FC<LightningExplosionProps> = ({
  visible,
  onAnimationComplete,
}) => {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lightning1Scale = useRef(new Animated.Value(0)).current;
  const lightning2Scale = useRef(new Animated.Value(0)).current;
  const lightning3Scale = useRef(new Animated.Value(0)).current;
  const sparkle1Opacity = useRef(new Animated.Value(0)).current;
  const sparkle2Opacity = useRef(new Animated.Value(0)).current;
  const sparkle3Opacity = useRef(new Animated.Value(0)).current;
  const sparkle4Opacity = useRef(new Animated.Value(0)).current;
  const prevVisibleRef = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const interactionHandleRef = useRef<{ cancel: () => void } | null>(null);
  const onAnimationCompleteRef = useRef(onAnimationComplete);

  // Keep callback ref updated
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  useEffect(() => {
    // Only animate when visible changes from false to true
    if (!visible) {
      prevVisibleRef.current = false;
      // Stop any running animation
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      return;
    }

    // If it was already visible, don't restart animation
    if (prevVisibleRef.current) {
      return;
    }

    prevVisibleRef.current = true;

    // Use InteractionManager to ensure we're not in render phase
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      // Reset all animations (safely outside render)
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotationAnim.setValue(0);
      lightning1Scale.setValue(0);
      lightning2Scale.setValue(0);
      lightning3Scale.setValue(0);
      sparkle1Opacity.setValue(0);
      sparkle2Opacity.setValue(0);
      sparkle3Opacity.setValue(0);
      sparkle4Opacity.setValue(0);

      // Start animation after reset
      // Main explosion animation sequence
      const animation = Animated.parallel([
        // Main scale and opacity
        Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 2.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Rotation
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Lightning bolts (staggered)
      Animated.stagger(50, [
        Animated.sequence([
          Animated.timing(lightning1Scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(lightning1Scale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(lightning2Scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(lightning2Scale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(lightning3Scale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(lightning3Scale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Sparkles (staggered)
      Animated.stagger(30, [
        Animated.sequence([
          Animated.timing(sparkle1Opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle1Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle2Opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle2Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle3Opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle3Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(sparkle4Opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle4Opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
      ]);

      // Store animation reference
      animationRef.current = animation;
      
      animation.start(({ finished }) => {
        if (finished) {
          prevVisibleRef.current = false;
          animationRef.current = null;
          // Use ref to avoid dependency issues
          onAnimationCompleteRef.current();
        }
      });
    });

    // Cleanup function
    return () => {
      if (interactionHandleRef.current) {
        interactionHandleRef.current.cancel();
        interactionHandleRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [visible, scaleAnim, opacityAnim, rotationAnim, lightning1Scale, lightning2Scale, lightning3Scale, sparkle1Opacity, sparkle2Opacity, sparkle3Opacity, sparkle4Opacity]);

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Sparkle positions (around the center)
  const sparklePositions = [
    { x: -60, y: -60 },
    { x: 60, y: -60 },
    { x: -60, y: 60 },
    { x: 60, y: 60 },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        style={[styles.container, { width: viewportWidth, height: viewportHeight }]}
        pointerEvents="none"
      >
      {/* Main explosion circle */}
      <Animated.View
        style={[
          styles.explosionCircle,
          {
            transform: [
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.circleInner} />
      </Animated.View>

      {/* Lightning bolts */}
      <Animated.View
        style={[
          styles.lightningContainer,
          {
            transform: [
              { rotate: rotation },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.lightningBolt,
            {
              transform: [{ scale: lightning1Scale }],
            },
          ]}
        >
          <Ionicons name="flash" size={40} color={colors.warning} />
        </Animated.View>
        <Animated.View
          style={[
            styles.lightningBolt,
            {
              transform: [{ rotate: '120deg' }, { scale: lightning2Scale }],
            },
          ]}
        >
          <Ionicons name="flash" size={40} color={colors.warning} />
        </Animated.View>
        <Animated.View
          style={[
            styles.lightningBolt,
            {
              transform: [{ rotate: '240deg' }, { scale: lightning3Scale }],
            },
          ]}
        >
          <Ionicons name="flash" size={40} color={colors.warning} />
        </Animated.View>
      </Animated.View>

      {/* Sparkles */}
      {sparklePositions.map((pos, index) => {
        const opacity = index === 0 ? sparkle1Opacity :
                       index === 1 ? sparkle2Opacity :
                       index === 2 ? sparkle3Opacity :
                       sparkle4Opacity;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.sparkle,
              {
                left: pos.x,
                top: pos.y,
                opacity: opacity,
              },
            ]}
          >
            <Ionicons name="star" size={16} color={colors.tertiary} />
          </Animated.View>
        );
      })}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  explosionCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: createColorWithOpacity(colors.warning, 0.3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: createColorWithOpacity(colors.tertiary, 0.5),
  },
  lightningContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightningBolt: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LightningExplosion;


import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { colors } from '../../constants/designSystem';
import { createColorWithOpacity } from '../../constants/colors';

interface CoolSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  title: string;
  style?: any;
  size?: 'small' | 'large';
  color?: string; // Custom color for the slider
}

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth - 160; // Account for padding and buttons
const THUMB_SIZE = 22;
const TRACK_HEIGHT = 6;
const BUTTON_SIZE = 28;

export const CoolSlider: React.FC<CoolSliderProps> = ({
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  title,
  style,
  size = 'small',
  color = colors.secondary, // Default to secondary (golden) accent
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const thumbPosition = useRef(new Animated.Value(0)).current;

  // Calculate the position based on value
  const getPositionFromValue = (val: number) => {
    const percentage = (val - min) / (max - min);
    return percentage * (SLIDER_WIDTH - THUMB_SIZE);
  };

  // Calculate value from position
  const getValueFromPosition = (position: number) => {
    const percentage = position / (SLIDER_WIDTH - THUMB_SIZE);
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  };

  // Initialize position
  useEffect(() => {
    const position = getPositionFromValue(value);
    thumbPosition.setValue(position);
  }, [value]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gestureState) => {
      setIsDragging(true);
      Animated.spring(scale, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: (_, gestureState) => {
      const currentPosition = getPositionFromValue(value);
      const newPosition = Math.max(0, Math.min(SLIDER_WIDTH - THUMB_SIZE, currentPosition + gestureState.dx));
      const newValue = getValueFromPosition(newPosition);
      
      // Ensure value stays within bounds
      const clampedValue = Math.max(min, Math.min(max, newValue));
      onValueChange(clampedValue);
      
      thumbPosition.setValue(newPosition);
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    },
  });

  const handleTrackPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const newValue = getValueFromPosition(locationX);
    
    // Ensure value stays within bounds
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onValueChange(clampedValue);
    
    // Animate thumb to new position
    const newPosition = getPositionFromValue(clampedValue);
    Animated.spring(thumbPosition, {
      toValue: newPosition,
      useNativeDriver: false,
    }).start();
  };

  const handleDecrease = () => {
    // Double-check bounds before proceeding
    if (value <= min) return;
    
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
    
    // Animate thumb to new position
    const newPosition = getPositionFromValue(newValue);
    Animated.spring(thumbPosition, {
      toValue: newPosition,
      useNativeDriver: false,
    }).start();
  };

  const handleIncrease = () => {
    // Double-check bounds before proceeding
    if (value >= max) return;
    
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
    
    // Animate thumb to new position
    const newPosition = getPositionFromValue(newValue);
    Animated.spring(thumbPosition, {
      toValue: newPosition,
      useNativeDriver: false,
    }).start();
  };

  const translateStyle = {
    transform: [{ translateX: thumbPosition }],
  };

  const scaleStyle = {
    transform: [{ scale: scale }],
  };

  const progressPercentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={styles.sliderContainer}>
        {/* Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={[styles.valueText, size === 'large' && styles.valueTextLarge]}>{value}</Text>
          {unit && <Text style={[styles.unitText, size === 'large' && styles.unitTextLarge]}>{unit}</Text>}
        </View>

        {/* Slider Track with Buttons */}
        <View style={styles.sliderWithButtons}>
          {/* Decrease Button */}
          <TouchableOpacity 
            style={[
              styles.button, 
              value <= min && styles.buttonDisabled
            ]} 
            onPress={handleDecrease}
            disabled={value <= min}
          >
            <Text style={[styles.buttonText, value <= min && styles.buttonTextDisabled]}>-</Text>
          </TouchableOpacity>

          {/* Slider Track */}
          <View style={styles.trackContainer}>
            <View style={styles.track}>
              <View 
                style={[
                  styles.progress, 
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: createColorWithOpacity(color, 0.35)
                  }
                ]} 
              />
            </View>
            
            {/* Draggable Thumb */}
            <Animated.View 
              style={[
                styles.thumb, 
                translateStyle,
                { shadowColor: color }
              ]}
              {...panResponder.panHandlers}
            >
              <Animated.View style={scaleStyle}>
                <View style={[styles.thumbInner, { backgroundColor: color }]} />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Increase Button */}
          <TouchableOpacity 
            style={[
              styles.button, 
              value >= max && styles.buttonDisabled
            ]} 
            onPress={handleIncrease}
            disabled={value >= max}
          >
            <Text style={[styles.buttonText, value >= max && styles.buttonTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Min/Max Labels */}
        <View style={styles.labelsContainer}>
          <Text style={styles.labelText}>{min}</Text>
          <Text style={styles.labelText}>{max}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 0,
    flex: 0,
    minHeight: 56,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  sliderContainer: {
    alignItems: 'center',
    flex: 0, // Don't expand
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    minHeight: 18,
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 16,
  },
  unitText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  valueTextLarge: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  unitTextLarge: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  sliderWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  trackContainer: {
    width: SLIDER_WIDTH - 32,
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 8,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  progress: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: createColorWithOpacity(colors.secondary, 0.65),
  },
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.8),
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SLIDER_WIDTH,
  },
  labelText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  button: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
  },
  buttonDisabled: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.12),
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonTextDisabled: {
    color: createColorWithOpacity(colors.primary, 0.4),
  },
});

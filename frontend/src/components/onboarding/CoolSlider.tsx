import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { colors } from '../../constants/designSystem';

interface CoolSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  title: string;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth - 100; // Account for padding
const THUMB_SIZE = 20;
const TRACK_HEIGHT = 4;

export const CoolSlider: React.FC<CoolSliderProps> = ({
  value,
  onValueChange,
  min,
  max,
  step,
  unit,
  title,
  style,
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
      onValueChange(newValue);
      
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
    onValueChange(newValue);
    
    // Animate thumb to new position
    const newPosition = getPositionFromValue(newValue);
    Animated.spring(thumbPosition, {
      toValue: newPosition,
      useNativeDriver: false,
    }).start();
  };

  const animatedStyle = {
    transform: [
      { translateX: thumbPosition },
      { scale: scale },
    ],
  };

  const progressPercentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.sliderContainer}>
        {/* Value Display */}
        <View style={styles.valueDisplay}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {/* Slider Track */}
        <View style={styles.trackContainer}>
          <View style={styles.track}>
            <View 
              style={[
                styles.progress, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          
          {/* Draggable Thumb */}
          <Animated.View 
            style={[styles.thumb, animatedStyle]}
            {...panResponder.panHandlers}
          >
            <View style={styles.thumbInner} />
          </Animated.View>
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
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flex: 1,
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
    flex: 1,
  },
  valueDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
  },
  unitText: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  trackContainer: {
    width: SLIDER_WIDTH,
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  track: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.inputBorder,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
  },
  progress: {
    height: TRACK_HEIGHT,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
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
});

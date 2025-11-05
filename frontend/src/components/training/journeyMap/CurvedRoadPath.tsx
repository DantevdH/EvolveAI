/**
 * Curved Road Path Component
 * Renders segmented road with alternating primary/tertiary colors
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors, createColorWithOpacity } from '../../../constants/colors';
import { PathSegment } from './pathGenerator';

interface RoadSegment {
  segment: PathSegment;
  status: 'completed' | 'current' | 'locked';
}

interface CurvedRoadPathProps {
  segments: RoadSegment[];
  height: number;
  width: number;
}

const CurvedRoadPath: React.FC<CurvedRoadPathProps> = ({ segments, height, width }) => {
  const getSegmentColor = (weekNumber: number, status: 'completed' | 'current' | 'locked'): string => {
    // Alternate between primary (red) and tertiary (teal) based on week number
    const baseColor = weekNumber % 2 === 1 ? colors.primary : colors.tertiary;
    
    // Adjust opacity/intensity based on status
    if (status === 'completed') {
      return baseColor; // Full brightness for completed
    } else if (status === 'current') {
      return baseColor; // Full brightness for current (will have glow effect)
    } else {
      return createColorWithOpacity(baseColor, 0.25); // Faded for locked
    }
  };

  const getSegmentOpacity = (status: 'completed' | 'current' | 'locked'): number => {
    if (status === 'completed') {
      return 0.85;
    } else if (status === 'current') {
      return 1.0; // Full brightness for current week
    } else {
      return 0.25; // Faded for locked
    }
  };

  const getStrokeWidth = (status: 'completed' | 'current' | 'locked'): number => {
    if (status === 'current') {
      return 32; // Slightly thicker for current week
    }
    return 28; // Standard width
  };

  return (
    <Svg height={height} width={width}>
      {/* Render each segment with clean road styling */}
      {segments.map(({ segment, status }, index) => {
        const segmentColor = getSegmentColor(segment.weekNumber, status);
        const opacity = getSegmentOpacity(status);
        const strokeWidth = getStrokeWidth(status);

        return (
          <React.Fragment key={`segment-${segment.weekNumber}`}>
            {/* Subtle shadow for depth - only on active segments */}
            {status !== 'locked' && (
              <Path
                d={segment.pathData}
                stroke={colors.background}
                strokeWidth={strokeWidth + 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.15}
              />
            )}
            
            {/* Main road segment */}
            <Path
              d={segment.pathData}
              stroke={segmentColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={opacity}
            />
            
            {/* Subtle center line - only on completed/current */}
            {status !== 'locked' && (
              <Path
                d={segment.pathData}
                stroke={createColorWithOpacity(colors.text, 0.2)}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="12,10"
                fill="none"
                opacity={opacity * 0.7}
              />
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export default CurvedRoadPath;


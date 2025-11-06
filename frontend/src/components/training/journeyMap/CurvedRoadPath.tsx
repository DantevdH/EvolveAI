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
  // Lighter color of the card background (#1A1A26 -> #2A2A36)
  const roadColor = '#2A2A36'; // Lighter shade of card background

  const getSegmentOpacity = (status: 'completed' | 'current' | 'locked'): number => {
    if (status === 'completed') {
      return 0.9;
    } else if (status === 'current') {
      return 1.0; // Full brightness for current week
    } else {
      return 0.3; // Faded for locked
    }
  };

  // Thick road width increased to accommodate larger nodes (35px)
  const getStrokeWidth = (status: 'completed' | 'current' | 'locked'): number => {
    return 42; // Increased from 26 to better accommodate 35px nodes
  };

  return (
    <Svg height={height} width={width}>
      {/* Render each segment with clean road styling */}
      {segments.map(({ segment, status }, index) => {
        const opacity = getSegmentOpacity(status);
        const strokeWidth = getStrokeWidth(status);

        return (
          <React.Fragment key={`segment-${segment.weekNumber}`}>
            {/* Subtle shadow for depth - only on active segments */}
            {status !== 'locked' && (
              <Path
                d={segment.pathData}
                stroke={colors.card}
                strokeWidth={strokeWidth + 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.15}
              />
            )}
            
            {/* Main road segment - lighter background color */}
            <Path
              d={segment.pathData}
              stroke={roadColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={opacity}
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
};

export default CurvedRoadPath;


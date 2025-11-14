/**
 * Curved Road Path Component
 * Single centered line connecting circles on card edges
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { PathSegment } from './pathGenerator';
import { colors, createColorWithOpacity } from '../../../constants/colors';

interface RoadSegment {
  segment: PathSegment;
  status: 'completed' | 'current' | 'locked';
}

interface CurvedRoadPathProps {
  segments: RoadSegment[];
  height: number;
  width: number;
}

const STROKE_WIDTH = 3; // Slightly thicker for better visibility

// Status-based colors
const getPathColor = (status: 'completed' | 'current' | 'locked'): string => {
  switch (status) {
    case 'completed':
      return colors.secondary; // Golden
    case 'current':
      return colors.secondary; // Golden
    case 'locked':
      return createColorWithOpacity(colors.muted, 0.3); // Muted gray
    default:
      return createColorWithOpacity(colors.muted, 0.3);
  }
};

const CurvedRoadPath: React.FC<CurvedRoadPathProps> = ({ segments, height, width }) => {
  return (
    <Svg height={height} width={width} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Render path segments with status-based colors - lines connect circles on card edges */}
      {segments.map(({ segment, status }, index) =>
        segment && segment.pathData ? (
          <Path
            key={`segment-${segment.weekNumber}-${index}`}
            d={segment.pathData}
            stroke={getPathColor(status)}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null
      )}
    </Svg>
  );
};

export default CurvedRoadPath;

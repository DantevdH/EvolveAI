/**
 * Curved Road Path Component
 * Renders segmented road with alternating primary/tertiary colors
 */

import React from 'react';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, createColorWithOpacity, goldenGradient } from '../../../constants/colors';
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

const gradientId = 'journeyRoadGradient';

const STROKE_LOOKUP = {
  completed: `url(#${gradientId}-completed)` as const,
  current: `url(#${gradientId}-current)` as const,
  locked: `url(#${gradientId}-locked)` as const,
};

const OPACITY_LOOKUP = {
  completed: 1,
  current: 1,
  locked: 0.6,
};

const STROKE_WIDTH = 42;

const CurvedRoadPath: React.FC<CurvedRoadPathProps> = ({ segments, height, width }) => {
  return (
    <Svg height={height} width={width}>
      <Defs>
        <SvgLinearGradient id={`${gradientId}-completed`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.secondary} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={colors.secondary} stopOpacity={0.2} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${gradientId}-current`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.secondary} stopOpacity={0.6} />
          <Stop offset="100%" stopColor={colors.secondary} stopOpacity={0.25} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${gradientId}-locked`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.secondary} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={colors.secondary} stopOpacity={0.12} />
        </SvgLinearGradient>
      </Defs>

      {segments.map(({ segment, status }) => (
        <Path
          key={`segment-${segment.weekNumber}`}
          d={segment.pathData}
          stroke={STROKE_LOOKUP[status]}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={OPACITY_LOOKUP[status]}
        />
      ))}
    </Svg>
  );
};

export default CurvedRoadPath;


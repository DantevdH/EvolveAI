/**
 * Curved Road Path Component
 * Renders the SVG curved road using bezier curves
 */

import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../../constants/colors';

interface CurvedRoadPathProps {
  pathData: string;
  height: number;
  width: number;
}

const CurvedRoadPath: React.FC<CurvedRoadPathProps> = ({ pathData, height, width }) => {
  return (
    <Svg height={height} width={width}>
      <Defs>
        <LinearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
          <Stop offset="50%" stopColor={colors.secondary} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.8" />
        </LinearGradient>
      </Defs>
      
      {/* Road path with gradient */}
      <Path
        d={pathData}
        stroke="url(#roadGradient)"
        strokeWidth={70}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.3}
      />
      
      {/* Road border for depth */}
      <Path
        d={pathData}
        stroke={colors.border}
        strokeWidth={74}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.2}
      />
    </Svg>
  );
};

export default CurvedRoadPath;


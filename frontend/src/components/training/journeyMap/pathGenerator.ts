/**
 * Curved Road Path Generator
 * Generates SVG bezier curves for the journey map
 */

import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathSegment {
  pathData: string;
  startPoint: PathPoint;
  endPoint: PathPoint;
  weekNumber: number;
}

export interface PathConfig {
  startX: number;
  startY: number;
  segmentHeight: number;
  curveAmplitude: number;
}

/**
 * Generate curved road path using bezier curves
 * @param numWeeks - total number of weeks in the plan
 * @param config - path configuration
 * @returns SVG path data string, array of segments, and array of node positions
 */
export const generateCurvedPath = (
  numWeeks: number,
  config?: Partial<PathConfig>
): { pathData: string; segments: PathSegment[]; nodePositions: PathPoint[] } => {
  const defaultConfig: PathConfig = {
    startX: SCREEN_WIDTH / 2,
    startY: 80,
    segmentHeight: 160,
    curveAmplitude: SCREEN_WIDTH * 0.25,
  };

  const finalConfig = { ...defaultConfig, ...config };
  const { startX, startY, segmentHeight, curveAmplitude } = finalConfig;

  let pathData = `M ${startX} ${startY}`;
  const nodePositions: PathPoint[] = [];
  const segments: PathSegment[] = [];
  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < numWeeks; i++) {
    // Calculate curve direction (alternating left/right)
    const curveDirection = i % 2 === 0 ? 1 : -1;
    const targetX = startX + (curveDirection * curveAmplitude);
    const nextY = startY + ((i + 1) * segmentHeight);

    // Control points for smooth bezier curve
    const cp1X = currentX + (curveDirection * curveAmplitude * 0.5);
    const cp1Y = currentY + (segmentHeight * 0.3);
    const cp2X = targetX;
    const cp2Y = currentY + (segmentHeight * 0.7);

    // Create segment path data
    const segmentPathData = `M ${currentX} ${currentY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${nextY}`;
    
    // Store segment
    segments.push({
      pathData: segmentPathData,
      startPoint: { x: currentX, y: currentY },
      endPoint: { x: targetX, y: nextY },
      weekNumber: i + 1,
    });

    // Add to main path for backward compatibility
    pathData += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${nextY}`;

    // Update current position for next segment
    currentX = targetX;
    currentY = nextY;

    // Store node position at the end of this segment
    nodePositions.push({
      x: targetX,
      y: nextY,
    });
  }

  return { pathData, segments, nodePositions };
};


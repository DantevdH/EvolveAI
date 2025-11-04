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
 * @returns SVG path data string and array of node positions
 */
export const generateCurvedPath = (
  numWeeks: number,
  config?: Partial<PathConfig>
): { pathData: string; nodePositions: PathPoint[] } => {
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

  for (let i = 0; i < numWeeks; i++) {
    // Calculate curve direction (alternating left/right)
    const curveDirection = i % 2 === 0 ? 1 : -1;
    const targetX = startX + (curveDirection * curveAmplitude);
    const currentY = startY + (i * segmentHeight);
    const nextY = startY + ((i + 1) * segmentHeight);

    // Control points for smooth bezier curve
    const cp1X = startX + (curveDirection * curveAmplitude * 0.5);
    const cp1Y = currentY + (segmentHeight * 0.3);
    const cp2X = targetX;
    const cp2Y = currentY + (segmentHeight * 0.7);

    // Add cubic bezier curve to path
    if (i === 0) {
      // First segment: start from center
      pathData += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${nextY}`;
    } else {
      // Subsequent segments: curve from previous position
      pathData += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${targetX} ${nextY}`;
    }

    // Store node position at the end of this segment
    nodePositions.push({
      x: targetX,
      y: nextY,
    });
  }

  return { pathData, nodePositions };
};


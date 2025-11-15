/**
 * Curved Road Path Generator
 * Candy Crush style: gentle S-curve using Math.sin
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
  circleStart?: PathPoint;  // Circle position at connection start
  circleEnd?: PathPoint;    // Circle position at connection end
}

export interface PathConfig {
  startX: number;
  startY: number;
  segmentHeight: number;
  curveAmplitude: number;
  columnsPerRow?: number;
  containerWidth?: number; // Actual width of the content area (for proper centering)
}

/**
 * Generate Candy Crush style path: gentle S-curve using sine wave
 * Starts left, curves right, then back - creates natural flowing path
 * @param numWeeks - total number of weeks in the plan
 * @param config - optional path configuration
 * @returns SVG path data string, array of segments, and array of node positions
 */
export const generateCurvedPath = (
  numWeeks: number,
  config?: Partial<PathConfig>
): { pathData: string; segments: PathSegment[]; nodePositions: PathPoint[] } => {
  const amplitude = 40; // Gentle horizontal amplitude for S-curve
  
  // Use provided containerWidth or fallback to SCREEN_WIDTH
  // containerWidth should be the actual visible content width (accounting for card margins + padding)
  const containerWidth = config?.containerWidth || SCREEN_WIDTH;
  const centerX = containerWidth / 2;

  const nodePositions: PathPoint[] = [];
  const segments: PathSegment[] = [];
  
  // Calculate available vertical space
  const startY = 60;
  const availableHeight = 1600; // Doubled spacing between consecutive nodes
  
  // Create straight vertical line - all nodes centered horizontally
  // IMPORTANT:
  // - Week 1 should always start near the top (startY) so its position is stable
  //   whether we have 1 week (loading state) or many weeks (full plan).
  for (let i = 0; i < numWeeks; i++) {
    const isFirstWeek = i === 0;
    const t = numWeeks > 1 ? i / (numWeeks - 1) : 0;
    const y = isFirstWeek ? startY : startY + t * availableHeight;
    
    // All nodes on the same vertical line (centered)
    const x = centerX;
    
    nodePositions.push({ x, y });
  }

  // Create simple vertical line connections - centered with circle connectors on card edges
  // Card dimensions (must match WeekNode.tsx)
  const cardWidth = 220;
  const cardHeight = 65;
  
  for (let i = 0; i < nodePositions.length - 1; i++) {
    const curr = nodePositions[i];
    const next = nodePositions[i + 1];
    
    // Center of card (x is already centered)
    const centerX = curr.x;
    
    // Connection points: 
    // - Bottom edge of current card (circle sits on top of card at bottom edge)
    // - Top edge of next card (circle sits on top of card at top edge)
    // The line connects these circles but stops at the card edges (doesn't pass through)
    const bottomCircleY = curr.y + cardHeight / 2; // Bottom edge of current card
    const topCircleY = next.y - cardHeight / 2;    // Top edge of next card
    
    // Single centered vertical line connecting circles
    const segmentPathData = `M ${centerX} ${bottomCircleY} L ${centerX} ${topCircleY}`;
    
    segments.push({
      pathData: segmentPathData,
      startPoint: { x: centerX, y: bottomCircleY },
      endPoint: { x: centerX, y: topCircleY },
      weekNumber: i + 1,
      circleStart: { x: centerX, y: bottomCircleY }, // Bottom circle of current card
      circleEnd: { x: centerX, y: topCircleY },      // Top circle of next card
    });
  }

  // Build complete path data (simplified - single continuous line)
  let pathData = '';
  if (segments.length > 0) {
    pathData = segments[0].pathData;
    for (let i = 1; i < segments.length; i++) {
      const prevEnd = segments[i - 1].endPoint;
      const currStart = segments[i].startPoint;
      if (Math.abs(prevEnd.x - currStart.x) < 1 && Math.abs(prevEnd.y - currStart.y) < 5) {
        // Connect seamlessly if points are close
        pathData += ` L ${currStart.x} ${currStart.y}`;
      } else {
        // New path segment
        pathData += ` M ${currStart.x} ${currStart.y}`;
        pathData += ` ${segments[i].pathData.substring(segments[i].pathData.indexOf('L'))}`;
      }
    }
  }

  return { pathData, segments, nodePositions };
};

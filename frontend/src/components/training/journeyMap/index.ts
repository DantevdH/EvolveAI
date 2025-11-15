/**
 * Journey Map Components Barrel Export
 * Central export point for all journey map components
 */

export { default as FitnessJourneyMap } from './FitnessJourneyMap';
export { default as JourneyMapHeader } from './JourneyMapHeader';
export { default as JourneyCardContainer } from './JourneyCardContainer';
export { default as CurvedRoadPath } from './CurvedRoadPath';
export { default as WeekNode } from './WeekNode';
export { default as WeekDetailModal } from './WeekDetailModal';

// Utils
export * from './utils';
export * from './pathGenerator';
export * from './types';
export { useWeekNodeAnimations } from './WeekNodeAnimations';


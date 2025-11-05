export const SEARCH_DEBOUNCE_MS = 300;

export const SPORT_TYPES = [
  'running',
  'cycling',
  'swimming',
  'rowing',
  'hiking',
  'walking',
  'elliptical',
  'stair_climbing',
  'jump_rope',
  'other',
];

export const ALL_UNITS = ['minutes', 'km', 'miles', 'meters'];

export const getAvailableUnits = (isMetric: boolean): string[] => {
  if (isMetric) {
    return ['minutes', 'km'];
  } else {
    return ['minutes', 'miles'];
  }
};

export const getDefaultDurationForUnit = (unitType: string): number => {
  switch (unitType) {
    case 'minutes':
      return 30;
    case 'km':
      return 5;
    case 'miles':
      return 3;
    default:
      return 30;
  }
};

export const getSliderRange = (unit: string) => {
  switch (unit) {
    case 'minutes':
      return { min: 5, max: 180, step: 5 };
    case 'km':
      return { min: 0.5, max: 50, step: 0.5 };
    case 'miles':
      return { min: 0.5, max: 30, step: 0.5 };
    default:
      return { min: 5, max: 180, step: 5 };
  }
};


/**
 * Sport Metrics Utility Tests
 *
 * Unit tests for metric formatting functions used in live tracking.
 * Tests duration, distance, pace, speed, and elevation formatting.
 */

import {
  formatDuration,
  formatDistance,
  formatStandardPace,
  formatSwimmingPace,
  formatRowingPace,
  formatSportSpecificPace,
  formatSpeed,
  formatElevation,
  getMainMetric,
  getSecondaryMetricsForLive,
  getSecondaryMetricsForSummary,
  shouldShowCurrentAndAverage,
  getPaceFormat,
  formatSportName,
  formatSportNameShort,
  getMainMetricLabel,
  getAverageMetricLabel,
  getMetricDisplayInfo,
} from '../../utils/sportMetrics';

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7200)).toBe('2:00:00');
    expect(formatDuration(3723)).toBe('1:02:03');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should pad single digit seconds', () => {
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(65)).toBe('1:05');
  });

  it('should handle large durations', () => {
    expect(formatDuration(36000)).toBe('10:00:00'); // 10 hours
  });
});

describe('formatDistance', () => {
  describe('metric units', () => {
    it('should format distance in kilometers', () => {
      expect(formatDistance(5000, true)).toBe('5.00 km');
      expect(formatDistance(10500, true)).toBe('10.50 km');
    });

    it('should format small distances', () => {
      expect(formatDistance(500, true)).toBe('0.50 km');
      expect(formatDistance(100, true)).toBe('0.10 km');
    });

    it('should handle zero', () => {
      expect(formatDistance(0, true)).toBe('0.00 km');
    });

    it('should handle negative (return 0)', () => {
      expect(formatDistance(-100, true)).toBe('0.00 km');
    });
  });

  describe('imperial units', () => {
    it('should format distance in miles', () => {
      expect(formatDistance(1609.34, false)).toBe('1.00 mi');
      expect(formatDistance(8046.7, false)).toBe('5.00 mi');
    });

    it('should format small distances', () => {
      expect(formatDistance(804.67, false)).toBe('0.50 mi');
    });

    it('should handle zero', () => {
      expect(formatDistance(0, false)).toBe('0.00 mi');
    });

    it('should handle negative (return 0)', () => {
      expect(formatDistance(-100, false)).toBe('0.00 mi');
    });
  });
});

describe('formatStandardPace', () => {
  describe('metric units', () => {
    it('should format pace in min/km', () => {
      expect(formatStandardPace(360, true)).toBe('6:00 /km');
      expect(formatStandardPace(300, true)).toBe('5:00 /km');
    });

    it('should format pace with seconds', () => {
      expect(formatStandardPace(378, true)).toBe('6:18 /km');
      expect(formatStandardPace(305, true)).toBe('5:05 /km');
    });

    it('should handle null', () => {
      expect(formatStandardPace(null, true)).toBe('--:-- /km');
    });

    it('should handle zero', () => {
      expect(formatStandardPace(0, true)).toBe('--:-- /km');
    });

    it('should handle negative', () => {
      expect(formatStandardPace(-100, true)).toBe('--:-- /km');
    });

    it('should handle Infinity', () => {
      expect(formatStandardPace(Infinity, true)).toBe('--:-- /km');
    });
  });

  describe('imperial units', () => {
    it('should format pace in min/mi', () => {
      // 6:00/km ≈ 9:39/mi
      const result = formatStandardPace(360, false);
      expect(result).toContain('/mi');
      expect(result).toContain('9:');
    });

    it('should handle null', () => {
      expect(formatStandardPace(null, false)).toBe('--:-- /mi');
    });
  });
});

describe('formatSwimmingPace', () => {
  describe('metric units', () => {
    it('should format pace per 100m', () => {
      // 1000 sec/km = 100 sec/100m = 1:40/100m
      expect(formatSwimmingPace(1000, true)).toBe('1:40 /100m');
    });

    it('should handle typical swim pace', () => {
      // 2:00/100m = 1200 sec/km
      expect(formatSwimmingPace(1200, true)).toBe('2:00 /100m');
    });

    it('should handle null', () => {
      expect(formatSwimmingPace(null, true)).toBe('--:-- /100m');
    });
  });

  describe('imperial units', () => {
    it('should format pace per 100yd', () => {
      const result = formatSwimmingPace(1000, false);
      expect(result).toContain('/100yd');
    });

    it('should handle null', () => {
      expect(formatSwimmingPace(null, false)).toBe('--:-- /100yd');
    });
  });
});

describe('formatRowingPace', () => {
  it('should format pace per 500m', () => {
    // 400 sec/km = 200 sec/500m = 3:20/500m
    expect(formatRowingPace(400, )).toBe('3:20 /500m');
  });

  it('should handle typical rowing pace', () => {
    // 2:00/500m = 240 sec/500m = 480 sec/km
    expect(formatRowingPace(480)).toBe('4:00 /500m');
  });

  it('should handle null', () => {
    expect(formatRowingPace(null)).toBe('--:-- /500m');
  });

  it('should handle zero', () => {
    expect(formatRowingPace(0)).toBe('--:-- /500m');
  });
});

describe('formatSportSpecificPace', () => {
  it('should use standard pace for running', () => {
    expect(formatSportSpecificPace(360, 'running', true)).toBe('6:00 /km');
  });

  it('should use swimming pace for swimming', () => {
    expect(formatSportSpecificPace(1200, 'swimming', true)).toBe('2:00 /100m');
  });

  it('should use rowing pace for rowing', () => {
    expect(formatSportSpecificPace(400, 'rowing', true)).toBe('3:20 /500m');
  });

  it('should use standard pace for other sports', () => {
    expect(formatSportSpecificPace(360, 'hiking', true)).toBe('6:00 /km');
    expect(formatSportSpecificPace(360, 'walking', true)).toBe('6:00 /km');
  });

  it('should handle unknown sport type', () => {
    expect(formatSportSpecificPace(360, 'unknown', true)).toBe('6:00 /km');
  });
});

describe('formatSpeed', () => {
  describe('metric units', () => {
    it('should format speed in km/h', () => {
      expect(formatSpeed(25.5, true)).toBe('25.5 km/h');
      expect(formatSpeed(10, true)).toBe('10.0 km/h');
    });

    it('should handle zero', () => {
      expect(formatSpeed(0, true)).toBe('0.0 km/h');
    });

    it('should handle null', () => {
      expect(formatSpeed(null, true)).toBe('0.0 km/h');
    });

    it('should handle negative (return 0)', () => {
      expect(formatSpeed(-10, true)).toBe('0.0 km/h');
    });
  });

  describe('imperial units', () => {
    it('should format speed in mph', () => {
      expect(formatSpeed(16.0934, false)).toBe('10.0 mph');
    });

    it('should handle null', () => {
      expect(formatSpeed(null, false)).toBe('0.0 mph');
    });
  });
});

describe('formatElevation', () => {
  describe('metric units', () => {
    it('should format elevation with + prefix', () => {
      expect(formatElevation(150, true, '+')).toBe('+150 m');
    });

    it('should format elevation with - prefix', () => {
      expect(formatElevation(75, true, '-')).toBe('-75 m');
    });

    it('should round to whole meters', () => {
      expect(formatElevation(150.7, true, '+')).toBe('+151 m');
    });

    it('should handle zero', () => {
      expect(formatElevation(0, true, '+')).toBe('+0 m');
    });
  });

  describe('imperial units', () => {
    it('should format elevation in feet', () => {
      // 30.48m = 100ft
      expect(formatElevation(30.48, false, '+')).toBe('+100 ft');
    });

    it('should round to whole feet', () => {
      expect(formatElevation(100, false, '+')).toBe('+328 ft');
    });
  });
});

describe('getMainMetric', () => {
  it('should return pace for running', () => {
    expect(getMainMetric('running')).toBe('pace');
  });

  it('should return speed for cycling', () => {
    expect(getMainMetric('cycling')).toBe('speed');
  });

  it('should return pace for swimming', () => {
    expect(getMainMetric('swimming')).toBe('pace');
  });

  it('should return pace for rowing', () => {
    expect(getMainMetric('rowing')).toBe('pace');
  });

  it('should return time for stair climbing', () => {
    expect(getMainMetric('stair_climbing')).toBe('time');
  });

  it('should return time for jump rope', () => {
    expect(getMainMetric('jump_rope')).toBe('time');
  });

  it('should return time for unknown sport', () => {
    expect(getMainMetric('unknown')).toBe('time');
  });
});

describe('getSecondaryMetricsForLive', () => {
  it('should return elevation for outdoor sports', () => {
    expect(getSecondaryMetricsForLive('running')).toContain('elevation');
    expect(getSecondaryMetricsForLive('cycling')).toContain('elevation');
    expect(getSecondaryMetricsForLive('hiking')).toContain('elevation');
  });

  it('should not return elevation for indoor sports', () => {
    expect(getSecondaryMetricsForLive('stair_climbing')).not.toContain('elevation');
    expect(getSecondaryMetricsForLive('jump_rope')).not.toContain('elevation');
  });

  it('should return distance for distance-based sports', () => {
    expect(getSecondaryMetricsForLive('running')).toContain('distance');
    expect(getSecondaryMetricsForLive('swimming')).toContain('distance');
  });

  it('should return duration for most sports', () => {
    expect(getSecondaryMetricsForLive('running')).toContain('duration');
  });
});

describe('getSecondaryMetricsForSummary', () => {
  it('should include heart rate when available', () => {
    const metrics = getSecondaryMetricsForSummary('running', true, false, true);
    expect(metrics).toContain('heartRate');
  });

  it('should include calories when available', () => {
    const metrics = getSecondaryMetricsForSummary('running', false, true, true);
    expect(metrics).toContain('calories');
  });

  it('should include elevation when available for outdoor sports', () => {
    const metrics = getSecondaryMetricsForSummary('running', false, false, true);
    expect(metrics).toContain('elevation');
  });

  it('should include elevation for stair climbing when from health app', () => {
    const metrics = getSecondaryMetricsForSummary('stair_climbing', false, false, true);
    expect(metrics).toContain('elevation');
  });

  it('should not include elevation when not available', () => {
    const metrics = getSecondaryMetricsForSummary('running', false, false, false);
    expect(metrics).not.toContain('elevation');
  });
});

describe('shouldShowCurrentAndAverage', () => {
  it('should return true for pace-based sports', () => {
    expect(shouldShowCurrentAndAverage('running')).toBe(true);
    expect(shouldShowCurrentAndAverage('swimming')).toBe(true);
  });

  it('should return true for speed-based sports', () => {
    expect(shouldShowCurrentAndAverage('cycling')).toBe(true);
  });

  it('should return false for time-based sports', () => {
    expect(shouldShowCurrentAndAverage('stair_climbing')).toBe(false);
    expect(shouldShowCurrentAndAverage('jump_rope')).toBe(false);
  });
});

describe('getPaceFormat', () => {
  it('should return standard for running', () => {
    expect(getPaceFormat('running')).toBe('standard');
  });

  it('should return per100m for swimming', () => {
    expect(getPaceFormat('swimming')).toBe('per100m');
  });

  it('should return per500m for rowing', () => {
    expect(getPaceFormat('rowing')).toBe('per500m');
  });

  it('should return standard for unknown', () => {
    expect(getPaceFormat('unknown')).toBe('standard');
  });
});

describe('formatSportName', () => {
  it('should format sport names correctly', () => {
    expect(formatSportName('running')).toBe('Running');
    expect(formatSportName('cycling')).toBe('Cycling');
    expect(formatSportName('stair_climbing')).toBe('Stair Climbing');
    expect(formatSportName('jump_rope')).toBe('Jump Rope');
  });

  it('should handle unknown sport', () => {
    expect(formatSportName('unknown')).toBe('Workout');
  });
});

describe('formatSportNameShort', () => {
  it('should return short sport names', () => {
    expect(formatSportNameShort('running')).toBe('Run');
    expect(formatSportNameShort('cycling')).toBe('Ride');
    expect(formatSportNameShort('swimming')).toBe('Swim');
  });

  it('should handle unknown sport', () => {
    expect(formatSportNameShort('unknown')).toBe('Workout');
  });
});

describe('getMainMetricLabel', () => {
  it('should return Current Pace for pace sports', () => {
    expect(getMainMetricLabel('running')).toBe('Current Pace');
  });

  it('should return Current Speed for speed sports', () => {
    expect(getMainMetricLabel('cycling')).toBe('Current Speed');
  });

  it('should return Duration for time sports', () => {
    expect(getMainMetricLabel('stair_climbing')).toBe('Duration');
  });
});

describe('getAverageMetricLabel', () => {
  it('should return Avg Pace for pace sports', () => {
    expect(getAverageMetricLabel('running')).toBe('Avg Pace');
  });

  it('should return Avg Speed for speed sports', () => {
    expect(getAverageMetricLabel('cycling')).toBe('Avg Speed');
  });

  it('should return empty for time sports', () => {
    expect(getAverageMetricLabel('stair_climbing')).toBe('');
  });
});

describe('getMetricDisplayInfo', () => {
  it('should return correct info for duration', () => {
    const info = getMetricDisplayInfo('duration');
    expect(info.label).toBe('Duration');
    expect(info.icon).toBe('time-outline');
  });

  it('should return correct info for distance', () => {
    const info = getMetricDisplayInfo('distance');
    expect(info.label).toBe('Distance');
    expect(info.icon).toBe('navigate-outline');
  });

  it('should return correct info for heartRate', () => {
    const info = getMetricDisplayInfo('heartRate');
    expect(info.label).toBe('Heart Rate');
    expect(info.icon).toBe('heart-outline');
  });
});

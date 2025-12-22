/**
 * Tests for Heart Rate Zone Utilities
 * Validates zone-to-color mapping functions
 */

import {
  getZoneBackgroundColor,
  getZoneTextColor,
  getZoneBadgeStyle,
  isValidZone,
  getZoneLabel,
  MIN_ZONE,
  MAX_ZONE,
} from '../../utils/heartRateZoneUtils';
import { colors, createColorWithOpacity } from '../../constants/colors';

describe('Heart Rate Zone Utilities', () => {
  describe('getZoneBackgroundColor', () => {
    it('should return muted color with low opacity for zone 1', () => {
      const color = getZoneBackgroundColor(1);
      expect(color).toBe(createColorWithOpacity(colors.muted, 0.15));
    });

    it('should return muted color with medium opacity for zone 2', () => {
      const color = getZoneBackgroundColor(2);
      expect(color).toBe(createColorWithOpacity(colors.muted, 0.25));
    });

    it('should return primary color with low opacity for zone 3', () => {
      const color = getZoneBackgroundColor(3);
      expect(color).toBe(createColorWithOpacity(colors.primary, 0.2));
    });

    it('should return primary color with medium opacity for zone 4', () => {
      const color = getZoneBackgroundColor(4);
      expect(color).toBe(createColorWithOpacity(colors.primary, 0.3));
    });

    it('should return primary color with higher opacity for zone 5', () => {
      const color = getZoneBackgroundColor(5);
      expect(color).toBe(createColorWithOpacity(colors.primary, 0.4));
    });

    it('should handle decimal zones by rounding', () => {
      expect(getZoneBackgroundColor(1.4)).toBe(getZoneBackgroundColor(1));
      expect(getZoneBackgroundColor(1.6)).toBe(getZoneBackgroundColor(2));
      expect(getZoneBackgroundColor(4.7)).toBe(getZoneBackgroundColor(5));
    });

    it('should clamp zones below minimum to zone 1', () => {
      expect(getZoneBackgroundColor(0)).toBe(getZoneBackgroundColor(1));
      expect(getZoneBackgroundColor(-1)).toBe(getZoneBackgroundColor(1));
      expect(getZoneBackgroundColor(-10)).toBe(getZoneBackgroundColor(1));
    });

    it('should clamp zones above maximum to zone 5', () => {
      expect(getZoneBackgroundColor(6)).toBe(getZoneBackgroundColor(5));
      expect(getZoneBackgroundColor(10)).toBe(getZoneBackgroundColor(5));
      expect(getZoneBackgroundColor(100)).toBe(getZoneBackgroundColor(5));
    });

    it('should return valid color format (rgba string)', () => {
      const color = getZoneBackgroundColor(3);
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^rgba?\(/);
    });

    it('should return different colors for different zones', () => {
      const zone1Color = getZoneBackgroundColor(1);
      const zone5Color = getZoneBackgroundColor(5);
      expect(zone1Color).not.toBe(zone5Color);
    });
  });

  describe('getZoneTextColor', () => {
    it('should return muted color for zone 1', () => {
      expect(getZoneTextColor(1)).toBe(colors.muted);
    });

    it('should return muted color for zone 2', () => {
      expect(getZoneTextColor(2)).toBe(colors.muted);
    });

    it('should return primary color for zone 3', () => {
      expect(getZoneTextColor(3)).toBe(colors.primary);
    });

    it('should return primary color for zone 4', () => {
      expect(getZoneTextColor(4)).toBe(colors.primary);
    });

    it('should return primary color for zone 5', () => {
      expect(getZoneTextColor(5)).toBe(colors.primary);
    });

    it('should handle decimal zones by rounding', () => {
      expect(getZoneTextColor(1.4)).toBe(getZoneTextColor(1));
      expect(getZoneTextColor(2.6)).toBe(getZoneTextColor(3));
    });

    it('should clamp zones below minimum to zone 1 color', () => {
      expect(getZoneTextColor(0)).toBe(colors.muted);
      expect(getZoneTextColor(-1)).toBe(colors.muted);
    });

    it('should clamp zones above maximum to zone 5 color', () => {
      expect(getZoneTextColor(6)).toBe(colors.primary);
      expect(getZoneTextColor(10)).toBe(colors.primary);
    });

    it('should return valid color format (hex string)', () => {
      const color = getZoneTextColor(3);
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#/);
    });
  });

  describe('getZoneBadgeStyle', () => {
    it('should return style object with backgroundColor and color', () => {
      const style = getZoneBadgeStyle(3);
      expect(style).toHaveProperty('backgroundColor');
      expect(style).toHaveProperty('color');
    });

    it('should return correct background color for zone', () => {
      const style = getZoneBadgeStyle(1);
      expect(style.backgroundColor).toBe(getZoneBackgroundColor(1));
    });

    it('should return correct text color for zone', () => {
      const style = getZoneBadgeStyle(5);
      expect(style.color).toBe(getZoneTextColor(5));
    });

    it('should return consistent style for same zone', () => {
      const style1 = getZoneBadgeStyle(3);
      const style2 = getZoneBadgeStyle(3);
      expect(style1).toEqual(style2);
    });

    it('should return different styles for different zones', () => {
      const style1 = getZoneBadgeStyle(1);
      const style5 = getZoneBadgeStyle(5);
      expect(style1).not.toEqual(style5);
    });

    it('should handle all valid zones (1-5)', () => {
      for (let zone = 1; zone <= 5; zone++) {
        const style = getZoneBadgeStyle(zone);
        expect(style.backgroundColor).toBeDefined();
        expect(style.color).toBeDefined();
        expect(typeof style.backgroundColor).toBe('string');
        expect(typeof style.color).toBe('string');
      }
    });
  });

  describe('isValidZone', () => {
    it('should return true for valid zones (1-5)', () => {
      expect(isValidZone(1)).toBe(true);
      expect(isValidZone(2)).toBe(true);
      expect(isValidZone(3)).toBe(true);
      expect(isValidZone(4)).toBe(true);
      expect(isValidZone(5)).toBe(true);
    });

    it('should return false for zone 0', () => {
      expect(isValidZone(0)).toBe(false);
    });

    it('should return false for zone 6', () => {
      expect(isValidZone(6)).toBe(false);
    });

    it('should return false for negative zones', () => {
      expect(isValidZone(-1)).toBe(false);
      expect(isValidZone(-10)).toBe(false);
    });

    it('should return false for decimal zones', () => {
      expect(isValidZone(1.5)).toBe(false);
      expect(isValidZone(3.7)).toBe(false);
    });

    it('should return false for non-integer values', () => {
      expect(isValidZone(1.1)).toBe(false);
      expect(isValidZone(4.9)).toBe(false);
    });
  });

  describe('getZoneLabel', () => {
    it('should return "Zone 1" for zone 1', () => {
      expect(getZoneLabel(1)).toBe('Zone 1');
    });

    it('should return "Zone 5" for zone 5', () => {
      expect(getZoneLabel(5)).toBe('Zone 5');
    });

    it('should return correct label for all valid zones', () => {
      for (let zone = 1; zone <= 5; zone++) {
        expect(getZoneLabel(zone)).toBe(`Zone ${zone}`);
      }
    });

    it('should handle decimal zones by rounding', () => {
      expect(getZoneLabel(1.4)).toBe('Zone 1');
      expect(getZoneLabel(2.6)).toBe('Zone 3');
      expect(getZoneLabel(4.7)).toBe('Zone 5');
    });

    it('should clamp zones below minimum to "Zone 1"', () => {
      expect(getZoneLabel(0)).toBe('Zone 1');
      expect(getZoneLabel(-1)).toBe('Zone 1');
    });

    it('should clamp zones above maximum to "Zone 5"', () => {
      expect(getZoneLabel(6)).toBe('Zone 5');
      expect(getZoneLabel(10)).toBe('Zone 5');
    });
  });

  describe('MIN_ZONE and MAX_ZONE constants', () => {
    it('should have MIN_ZONE equal to 1', () => {
      expect(MIN_ZONE).toBe(1);
    });

    it('should have MAX_ZONE equal to 5', () => {
      expect(MAX_ZONE).toBe(5);
    });
  });
});

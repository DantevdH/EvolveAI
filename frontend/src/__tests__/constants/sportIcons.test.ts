/**
 * Tests for Sport Icons Constants
 * Validates icon mapping for all sport types
 */

import { getSportIcon, hasSportIcon, getSportTypesWithIcons, SPORT_ICON_MAP, DEFAULT_SPORT_ICON } from '../../constants/sportIcons';
import { SPORT_TYPES } from '../../components/training/addExerciseModal/constants';

describe('Sport Icons Constants', () => {
  describe('getSportIcon', () => {
    it('should return correct icon for running', () => {
      expect(getSportIcon('running')).toBe('footsteps');
    });

    it('should return correct icon for cycling', () => {
      expect(getSportIcon('cycling')).toBe('bicycle');
    });

    it('should return correct icon for swimming', () => {
      expect(getSportIcon('swimming')).toBe('water');
    });

    it('should return correct icon for rowing', () => {
      expect(getSportIcon('rowing')).toBe('boat');
    });

    it('should return correct icon for hiking', () => {
      expect(getSportIcon('hiking')).toBe('trail-sign');
    });

    it('should return correct icon for walking', () => {
      expect(getSportIcon('walking')).toBe('walk');
    });

    it('should return correct icon for elliptical', () => {
      expect(getSportIcon('elliptical')).toBe('fitness');
    });

    it('should return correct icon for stair_climbing', () => {
      expect(getSportIcon('stair_climbing')).toBe('stairs');
    });

    it('should return correct icon for jump_rope', () => {
      expect(getSportIcon('jump_rope')).toBe('flash');
    });

    it('should return correct icon for other', () => {
      expect(getSportIcon('other')).toBe('ellipse');
    });

    it('should handle case-insensitive sport types', () => {
      expect(getSportIcon('RUNNING')).toBe('footsteps');
      expect(getSportIcon('Cycling')).toBe('bicycle');
      expect(getSportIcon('  SWIMMING  ')).toBe('water');
    });

    it('should return default icon for unknown sport types', () => {
      expect(getSportIcon('unknown_sport')).toBe(DEFAULT_SPORT_ICON);
      expect(getSportIcon('invalid')).toBe(DEFAULT_SPORT_ICON);
    });

    it('should return default icon for null input', () => {
      expect(getSportIcon(null)).toBe(DEFAULT_SPORT_ICON);
    });

    it('should return default icon for undefined input', () => {
      expect(getSportIcon(undefined)).toBe(DEFAULT_SPORT_ICON);
    });

    it('should return default icon for empty string', () => {
      expect(getSportIcon('')).toBe(DEFAULT_SPORT_ICON);
    });

    it('should return default icon for whitespace-only string', () => {
      expect(getSportIcon('   ')).toBe(DEFAULT_SPORT_ICON);
    });

    it('should map all sport types from SPORT_TYPES constant', () => {
      SPORT_TYPES.forEach((sportType) => {
        const icon = getSportIcon(sportType);
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('hasSportIcon', () => {
    it('should return true for valid sport types', () => {
      expect(hasSportIcon('running')).toBe(true);
      expect(hasSportIcon('cycling')).toBe(true);
      expect(hasSportIcon('swimming')).toBe(true);
    });

    it('should handle case-insensitive sport types', () => {
      expect(hasSportIcon('RUNNING')).toBe(true);
      expect(hasSportIcon('Cycling')).toBe(true);
      expect(hasSportIcon('  SWIMMING  ')).toBe(true);
    });

    it('should return false for unknown sport types', () => {
      expect(hasSportIcon('unknown_sport')).toBe(false);
      expect(hasSportIcon('invalid')).toBe(false);
    });

    it('should return false for null input', () => {
      expect(hasSportIcon(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(hasSportIcon(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasSportIcon('')).toBe(false);
    });
  });

  describe('getSportTypesWithIcons', () => {
    it('should return array of sport types with mapped icons', () => {
      const sportTypesWithIcons = getSportTypesWithIcons();
      expect(Array.isArray(sportTypesWithIcons)).toBe(true);
      expect(sportTypesWithIcons.length).toBeGreaterThan(0);
    });

    it('should include all valid sport types', () => {
      const sportTypesWithIcons = getSportTypesWithIcons();
      SPORT_TYPES.forEach((sportType) => {
        expect(sportTypesWithIcons).toContain(sportType);
      });
    });

    it('should only include sport types that have icons', () => {
      const sportTypesWithIcons = getSportTypesWithIcons();
      sportTypesWithIcons.forEach((sportType) => {
        expect(hasSportIcon(sportType)).toBe(true);
      });
    });
  });

  describe('SPORT_ICON_MAP', () => {
    it('should contain all sport types from SPORT_TYPES', () => {
      SPORT_TYPES.forEach((sportType) => {
        expect(SPORT_ICON_MAP[sportType]).toBeDefined();
        expect(typeof SPORT_ICON_MAP[sportType]).toBe('string');
      });
    });

    it('should have valid icon names for all mappings', () => {
      Object.values(SPORT_ICON_MAP).forEach((iconName) => {
        expect(iconName).toBeDefined();
        expect(typeof iconName).toBe('string');
        expect(iconName.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DEFAULT_SPORT_ICON', () => {
    it('should be defined', () => {
      expect(DEFAULT_SPORT_ICON).toBeDefined();
      expect(typeof DEFAULT_SPORT_ICON).toBe('string');
      expect(DEFAULT_SPORT_ICON.length).toBeGreaterThan(0);
    });

    it('should be "ellipse"', () => {
      expect(DEFAULT_SPORT_ICON).toBe('ellipse');
    });
  });
});

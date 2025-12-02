/**
 * Tests for WeekDetailModal Button Logic
 * Validates button text and disabled state based on week status
 */

import { getWeekButtonText, isWeekButtonDisabled } from '../../../../components/training/journeyMap/utils';
import { WeekModalData } from '../../../../components/training/journeyMap/types';

describe('WeekDetailModal - Button Logic', () => {
  const baseModalData: Partial<WeekModalData> = {
    weekNumber: 1,
    stars: 0,
    completionPercentage: 0,
    completedWorkouts: 0,
    totalWorkouts: 7,
    isUnlocked: false,
    isGenerated: false,
    isPastWeek: false,
  };

  describe('getWeekButtonText', () => {
    it('should return "Start Today\'s Training" for current week (generated)', () => {
      const text = getWeekButtonText('current', false);
      expect(text).toBe("Start Today's Training");
    });

    it('should return "Generate Training" for current week but not generated', () => {
      const text = getWeekButtonText('unlocked-not-generated', false);
      expect(text).toBe('Generate Training');
    });

    it('should return "Training Locked" for future week', () => {
      const text = getWeekButtonText('future-locked', false);
      expect(text).toBe('Training Locked');
    });

    it('should return "View Past Training" for past week (generated)', () => {
      const text = getWeekButtonText('completed', false);
      expect(text).toBe('View Past Training');
    });

    it('should return "Training Locked" for past week (not generated)', () => {
      const text = getWeekButtonText('past-not-generated', false);
      expect(text).toBe('Training Locked');
    });

    it('should return "Generating..." when isGenerating is true', () => {
      const text = getWeekButtonText('unlocked-not-generated', true);
      expect(text).toBe('Generating...');
    });

    it('should return "Training Locked" for generated future week', () => {
      const text = getWeekButtonText('generated', false);
      expect(text).toBe('Training Locked');
    });

    it('should return "Training Locked" as default fallback', () => {
      const text = getWeekButtonText('locked' as any, false);
      expect(text).toBe('Training Locked');
    });
  });

  describe('isWeekButtonDisabled', () => {
    it('should return false for "Start Today\'s Training" button', () => {
      const disabled = isWeekButtonDisabled("Start Today's Training");
      expect(disabled).toBe(false);
    });

    it('should return false for "Generate Training" button', () => {
      const disabled = isWeekButtonDisabled('Generate Training');
      expect(disabled).toBe(false);
    });

    it('should return true for "Training Locked" button', () => {
      const disabled = isWeekButtonDisabled('Training Locked');
      expect(disabled).toBe(true);
    });

    it('should return false for "View Past Training" button', () => {
      const disabled = isWeekButtonDisabled('View Past Training');
      expect(disabled).toBe(false);
    });

    it('should return false for "Generating..." button', () => {
      const disabled = isWeekButtonDisabled('Generating...');
      expect(disabled).toBe(false);
    });
  });

  describe('getWeekButtonText - Edge Cases', () => {
    it('should handle isGenerating=true for all statuses', () => {
      const statuses: WeekModalData['status'][] = [
        'current',
        'unlocked-not-generated',
        'future-locked',
        'completed',
        'past-not-generated',
        'generated',
      ];
      
      statuses.forEach(status => {
        const text = getWeekButtonText(status, true);
        expect(text).toBe('Generating...');
      });
    });

    it('should handle undefined status gracefully', () => {
      const text = getWeekButtonText(undefined as any, false);
      expect(text).toBe('Training Locked');
    });

    it('should handle null status gracefully', () => {
      const text = getWeekButtonText(null as any, false);
      expect(text).toBe('Training Locked');
    });
  });

  describe('isWeekButtonDisabled - Edge Cases', () => {
    it('should handle empty string', () => {
      const disabled = isWeekButtonDisabled('');
      expect(disabled).toBe(false);
    });

    it('should handle undefined button text', () => {
      const disabled = isWeekButtonDisabled(undefined as any);
      expect(disabled).toBe(false);
    });

    it('should handle null button text', () => {
      const disabled = isWeekButtonDisabled(null as any);
      expect(disabled).toBe(false);
    });

    it('should be case-sensitive for "Training Locked"', () => {
      expect(isWeekButtonDisabled('Training Locked')).toBe(true);
      expect(isWeekButtonDisabled('training locked')).toBe(false);
      expect(isWeekButtonDisabled('TRAINING LOCKED')).toBe(false);
      expect(isWeekButtonDisabled('Training locked')).toBe(false);
    });
  });

  describe('Button Text and Disabled State Integration', () => {
    it('should have consistent disabled state for all "Training Locked" variants', () => {
      const lockedStatuses: WeekModalData['status'][] = [
        'future-locked',
        'past-not-generated',
        'generated',
      ];
      
      lockedStatuses.forEach(status => {
        const text = getWeekButtonText(status, false);
        const disabled = isWeekButtonDisabled(text);
        expect(disabled).toBe(true);
        expect(text).toBe('Training Locked');
      });
    });

    it('should have enabled state for actionable buttons', () => {
      const actionableStatuses: Array<{ status: WeekModalData['status']; expectedText: string }> = [
        { status: 'current', expectedText: "Start Today's Training" },
        { status: 'unlocked-not-generated', expectedText: 'Generate Training' },
        { status: 'completed', expectedText: 'View Past Training' },
      ];
      
      actionableStatuses.forEach(({ status, expectedText }) => {
        const text = getWeekButtonText(status, false);
        const disabled = isWeekButtonDisabled(text);
        expect(text).toBe(expectedText);
        expect(disabled).toBe(false);
      });
    });
  });
});

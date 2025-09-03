/**
 * Onboarding service for data persistence and backend integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingData } from '../types/onboarding';
import { formatForAPI, sanitizeOnboardingData } from '../utils/onboardingUtils';

export interface OnboardingServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface OnboardingProgressData {
  data: OnboardingData;
  timestamp: number;
  version: string;
}

class OnboardingService {
  private readonly STORAGE_KEY = 'onboarding_progress';
  private readonly COMPLETED_KEY = 'onboarding_completed';
  private readonly VERSION = '1.0.0';

  /**
   * Saves onboarding progress to local storage
   */
  async saveProgress(data: OnboardingData): Promise<OnboardingServiceResponse> {
    try {
      const progressData: OnboardingProgressData = {
        data: sanitizeOnboardingData(data),
        timestamp: Date.now(),
        version: this.VERSION
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(progressData));
      
      return {
        success: true,
        data: progressData
      };
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save progress'
      };
    }
  }

  /**
   * Loads onboarding progress from local storage
   */
  async loadProgress(): Promise<OnboardingServiceResponse> {
    try {
      const savedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (!savedData) {
        return {
          success: true,
          data: null
        };
      }

      const progressData: OnboardingProgressData = JSON.parse(savedData);
      
      // Check if data is from a compatible version
      if (progressData.version !== this.VERSION) {
        console.warn('Onboarding data version mismatch, clearing old data');
        await this.clearProgress();
        return {
          success: true,
          data: null
        };
      }

      // Check if data is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - progressData.timestamp > maxAge) {
        console.warn('Onboarding data is too old, clearing');
        await this.clearProgress();
        return {
          success: true,
          data: null
        };
      }

      return {
        success: true,
        data: progressData.data
      };
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load progress'
      };
    }
  }

  /**
   * Clears onboarding progress from local storage
   */
  async clearProgress(): Promise<OnboardingServiceResponse> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear onboarding progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear progress'
      };
    }
  }

  /**
   * Submits completed onboarding data to backend
   */
  async submitOnboarding(data: OnboardingData): Promise<OnboardingServiceResponse> {
    try {
      // Sanitize and format data for API
      const sanitizedData = sanitizeOnboardingData(data);
      const apiData = formatForAPI(sanitizedData);

      // Here you would make the actual API call to your backend
      // For now, we'll simulate the API call
      const response = await this.simulateAPICall(apiData);

      if (response.success) {
        // Mark onboarding as completed
        await this.markAsCompleted();
        
        // Clear progress data
        await this.clearProgress();
      }

      return response;
    } catch (error) {
      console.error('Failed to submit onboarding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit onboarding'
      };
    }
  }

  /**
   * Checks if onboarding has been completed
   */
  async isCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(this.COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      console.error('Failed to check onboarding completion:', error);
      return false;
    }
  }

  /**
   * Marks onboarding as completed
   */
  async markAsCompleted(): Promise<OnboardingServiceResponse> {
    try {
      await AsyncStorage.setItem(this.COMPLETED_KEY, 'true');
      return { success: true };
    } catch (error) {
      console.error('Failed to mark onboarding as completed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark as completed'
      };
    }
  }

  /**
   * Resets onboarding completion status
   */
  async resetCompletion(): Promise<OnboardingServiceResponse> {
    try {
      await AsyncStorage.removeItem(this.COMPLETED_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to reset onboarding completion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset completion'
      };
    }
  }

  /**
   * Gets onboarding statistics
   */
  async getStatistics(): Promise<{
    hasProgress: boolean;
    isCompleted: boolean;
    progressAge?: number;
    completionDate?: number;
  }> {
    try {
      const [progressData, completedData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEY),
        AsyncStorage.getItem(this.COMPLETED_KEY)
      ]);

      const hasProgress = progressData !== null;
      const isCompleted = completedData === 'true';

      let progressAge: number | undefined;
      if (progressData) {
        const parsed = JSON.parse(progressData) as OnboardingProgressData;
        progressAge = Date.now() - parsed.timestamp;
      }

      return {
        hasProgress,
        isCompleted,
        progressAge,
        completionDate: isCompleted ? Date.now() : undefined
      };
    } catch (error) {
      console.error('Failed to get onboarding statistics:', error);
      return {
        hasProgress: false,
        isCompleted: false
      };
    }
  }

  /**
   * Simulates API call to backend (replace with actual implementation)
   */
  private async simulateAPICall(data: any): Promise<OnboardingServiceResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate random success/failure for testing
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          resolve({
            success: true,
            data: {
              id: Math.random().toString(36).substr(2, 9),
              submittedAt: new Date().toISOString(),
              ...data
            }
          });
        } else {
          resolve({
            success: false,
            error: 'Network error - please try again'
          });
        }
      }, 2000); // Simulate 2 second delay
    });
  }

  /**
   * Validates onboarding data before submission
   */
  validateOnboardingData(data: OnboardingData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.username || data.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters');
    }

    if (!data.age || data.age < 13 || data.age > 100) {
      errors.push('Age must be between 13 and 100');
    }

    if (!data.weight || data.weight <= 0) {
      errors.push('Weight must be greater than 0');
    }

    if (!data.height || data.height <= 0) {
      errors.push('Height must be greater than 0');
    }

    if (!data.gender) {
      errors.push('Gender is required');
    }

    if (!data.primaryGoal) {
      errors.push('Primary goal is required');
    }

    if (!data.experienceLevel) {
      errors.push('Experience level is required');
    }

    if (!data.equipment || data.equipment.length === 0) {
      errors.push('At least one equipment type is required');
    }

    if (!data.daysPerWeek || data.daysPerWeek < 1 || data.daysPerWeek > 7) {
      errors.push('Days per week must be between 1 and 7');
    }

    if (!data.minutesPerSession || data.minutesPerSession < 15 || data.minutesPerSession > 180) {
      errors.push('Minutes per session must be between 15 and 180');
    }

    if (!data.motivationLevel || data.motivationLevel < 1 || data.motivationLevel > 10) {
      errors.push('Motivation level must be between 1 and 10');
    }

    if (!data.termsAccepted) {
      errors.push('Terms of service must be accepted');
    }

    if (!data.privacyAccepted) {
      errors.push('Privacy policy must be accepted');
    }

    // Conditional validations
    if (data.hasHealthConditions && (!data.healthConditions || data.healthConditions.length === 0)) {
      errors.push('Please specify your health conditions');
    }

    if (data.hasLimitations && (!data.limitationsDescription || data.limitationsDescription.trim().length === 0)) {
      errors.push('Please describe your limitations');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Exports onboarding data for backup or migration
   */
  async exportData(): Promise<OnboardingServiceResponse> {
    try {
      const progressResponse = await this.loadProgress();
      
      if (!progressResponse.success || !progressResponse.data) {
        return {
          success: false,
          error: 'No onboarding data to export'
        };
      }

      const exportData = {
        data: progressResponse.data,
        exportedAt: new Date().toISOString(),
        version: this.VERSION
      };

      return {
        success: true,
        data: exportData
      };
    } catch (error) {
      console.error('Failed to export onboarding data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export data'
      };
    }
  }

  /**
   * Imports onboarding data from backup
   */
  async importData(importData: any): Promise<OnboardingServiceResponse> {
    try {
      // Validate import data structure
      if (!importData.data || !importData.version) {
        return {
          success: false,
          error: 'Invalid import data format'
        };
      }

      // Validate the data
      const validation = this.validateOnboardingData(importData.data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid data: ${validation.errors.join(', ')}`
        };
      }

      // Save the imported data
      const saveResponse = await this.saveProgress(importData.data);
      return saveResponse;
    } catch (error) {
      console.error('Failed to import onboarding data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import data'
      };
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
export default onboardingService;

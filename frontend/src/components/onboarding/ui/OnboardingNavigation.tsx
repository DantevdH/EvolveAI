import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingButton } from './OnboardingButton';

interface OnboardingNavigationProps {
  onNext: () => void;
  onBack?: () => void;
  nextTitle?: string;
  backTitle?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  nextIcon?: string;
  showBack?: boolean;
  variant?: 'single' | 'dual';
}

export const OnboardingNavigation: React.FC<OnboardingNavigationProps> = ({
  onNext,
  onBack,
  nextTitle = 'Continue',
  backTitle = 'Back',
  nextDisabled = false,
  backDisabled = false,
  nextIcon = 'arrow-forward',
  showBack = true,
  variant = 'dual',
}) => {
  if (variant === 'single') {
    return (
      <View style={styles.singleContainer}>
        <OnboardingButton
          title={nextTitle}
          onPress={onNext}
          disabled={nextDisabled}
          icon={nextIcon}
        />
      </View>
    );
  }

  // If no back button should be shown, use single container aligned to right
  if (!showBack || !onBack) {
    return (
      <View style={styles.singleContainerRight}>
        <OnboardingButton
          title={nextTitle}
          onPress={onNext}
          disabled={nextDisabled}
          icon={nextIcon}
        />
      </View>
    );
  }

  return (
    <View style={styles.dualContainer}>
      <View style={styles.buttonWrapper}>
        <OnboardingButton
          title={backTitle}
          onPress={onBack}
          disabled={backDisabled}
          variant="back"
        />
      </View>
      <View style={styles.buttonWrapper}>
        <OnboardingButton
          title={nextTitle}
          onPress={onNext}
          disabled={nextDisabled}
          icon={nextIcon}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  singleContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  singleContainerRight: {
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 40,
  },
  dualContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});
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
  nextIcon = 'arrow.right.circle.fill',
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

  return (
    <View style={styles.dualContainer}>
      {showBack && onBack && (
        <OnboardingButton
          title={backTitle}
          onPress={onBack}
          disabled={backDisabled}
          variant="back"
        />
      )}
      <OnboardingButton
        title={nextTitle}
        onPress={onNext}
        disabled={nextDisabled}
        icon={nextIcon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  singleContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  dualContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    gap: 16,
  },
});
/**
 * Reusable card layout component for onboarding screens
 */

import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/designSystem';

interface OnboardingCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  style?: any;
  scrollable?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  title,
  subtitle,
  children,
  style,
  scrollable = false,
  showBackButton = false,
  onBack
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        {showBackButton && onBack && (
          <View style={styles.backButtonContainer}>
            {/* Back button will be handled by individual components */}
          </View>
        )}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 0,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
});

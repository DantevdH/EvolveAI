/**
 * Reusable card layout component for onboarding screens
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../constants/colors';

interface OnboardingCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: any;
  scrollable?: boolean;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  title,
  subtitle,
  children,
  style,
  scrollable = false
}) => {
  const content = (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
});

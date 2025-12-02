/**
 * Full Profile Screen - Extracted Lessons as the Core
 * Minimalistic design matching homepage style
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { colors, createColorWithOpacity, goldenGradient } from '../../src/constants/colors';
import { WelcomeHeader } from '../../src/components/home/WelcomeHeader';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import {
  formatProfileValue,
  validateAndFilterLessons,
  sortLessonsByConfidence,
  getLessonsForPage,
  calculatePaginationBounds,
} from '../../src/utils/profileUtils';

const LESSONS_PER_PAGE = 1;

function FullProfileScreenContent() {
  const { state } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [currentPage, setCurrentPage] = useState(0);

  // Check if profile is loading
  const isLoading = (state as any).profileLoading === true;

  // Validate, filter, and sort lessons by confidence (highest first)
  const sortedLessons = useMemo(() => {
    if (!state.userProfile?.playbook?.lessons) return [];
    
    // Validate and filter lessons
    const validLessons = validateAndFilterLessons(state.userProfile.playbook.lessons);
    
    // Sort by confidence
    return sortLessonsByConfidence(validLessons);
  }, [state.userProfile?.playbook?.lessons]);

  const totalPages = Math.max(1, Math.ceil(sortedLessons.length / LESSONS_PER_PAGE));
  
  // Get lessons for current page with safe pagination
  const currentLessons = useMemo(() => {
    return getLessonsForPage(sortedLessons, currentPage, LESSONS_PER_PAGE);
  }, [sortedLessons, currentPage]);

  // Reset to first page when playbook changes
  useEffect(() => {
    setCurrentPage(0);
  }, [state.userProfile?.playbook?.lessons?.length]);

  // Ensure current page is within bounds when lessons change
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPage]);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => {
      const { page: safePage } = calculatePaginationBounds(prev - 1, totalPages);
      return safePage;
    });
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => {
      const { page: safePage } = calculatePaginationBounds(prev + 1, totalPages);
      return safePage;
    });
  };

  // Calculate responsive dimensions for profile cards
  const profileCardDimensions = useMemo(() => {
    const HORIZONTAL_PADDING = 16;
    const CARD_GAP = 8;
    const TOTAL_GAPS = CARD_GAP * 2;
    const AVAILABLE_WIDTH = screenWidth - (HORIZONTAL_PADDING * 2);
    const CARD_WIDTH = Math.floor((AVAILABLE_WIDTH - TOTAL_GAPS) / 3);
    
    return {
      cardWidth: CARD_WIDTH,
      gap: CARD_GAP,
      padding: HORIZONTAL_PADDING,
    };
  }, [screenWidth]);

  const profileStats = useMemo(() => {
    return [
      {
        title: 'Age',
        value: formatProfileValue(state.userProfile?.age),
        subtitle: 'years',
        icon: 'calendar' as keyof typeof Ionicons.glyphMap,
      },
      {
        title: 'Weight',
        value: formatProfileValue(state.userProfile?.weight),
        subtitle: state.userProfile?.weightUnit || 'kg',
        icon: 'scale' as keyof typeof Ionicons.glyphMap,
      },
      {
        title: 'Height',
        value: formatProfileValue(state.userProfile?.height),
        subtitle: state.userProfile?.heightUnit || 'cm',
        icon: 'resize' as keyof typeof Ionicons.glyphMap,
      },
    ];
  }, [state.userProfile]);

  // Show loading state only if profile itself is loading
  if (isLoading && !state.userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <WelcomeHeader username={undefined} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine playbook state for dynamic content
  const isPolling = state.isPollingPlan === true;
  const hasPlaybook = !!state.userProfile?.playbook;
  const hasLessons = sortedLessons.length > 0;
  const showPlaybookContent = hasPlaybook && hasLessons;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <WelcomeHeader username={state.userProfile?.username} />

        {/* Profile Information Cards - Minimalistic like homepage */}
        <View style={[styles.profileCards, { paddingHorizontal: profileCardDimensions.padding, gap: profileCardDimensions.gap }]}>
          {profileStats.map((stat, index) => (
            <ProfileStatCard 
              key={index} 
              {...stat} 
              cardWidth={profileCardDimensions.cardWidth}
            />
          ))}
        </View>

        {/* Extracted Lessons Section */}
        <View style={styles.playbookSection}>
          <LinearGradient
            colors={[createColorWithOpacity(colors.secondary, 0.08), createColorWithOpacity(colors.secondary, 0.03)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
          <View style={styles.sectionHeader}>
              <View style={styles.headerRow}>
                <Text
                  style={styles.sectionTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Extracted Lessons
                </Text>
            {showPlaybookContent && (
                  <View style={styles.headerAccessory}>
              <View style={styles.playbookBadge}>
                <Text style={styles.playbookBadgeText}>
                  {sortedLessons.length} {sortedLessons.length === 1 ? 'lesson' : 'lessons'}
                </Text>
                    </View>
              </View>
            )}
          </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
          {/* Dynamic content based on polling and playbook state */}
          {isPolling ? (
            /* Show spinner while polling */
            <View style={styles.playbookGeneratingContainer}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={styles.playbookGeneratingText}>
                Generating AI-extracted lessons...
              </Text>
              <Text style={styles.playbookGeneratingSubtext}>
                This may take a few moments
              </Text>
            </View>
          ) : showPlaybookContent ? (
            /* Show lessons when playbook exists */
            currentLessons.map((lesson, index) => {
            // Additional validation check before rendering
            if (!lesson || !lesson.id || !lesson.text) {
              return null;
            }
            
            return (
            <View key={lesson.id} style={styles.lessonCard}>
              {/* Lesson Header */}
              <View style={styles.lessonHeader}>
                <View style={styles.lessonNumberBadge}>
                  <Text style={styles.lessonNumber}>{currentPage + 1}</Text>
                </View>
                <View style={styles.lessonHeaderRight}>
                  <View style={styles.confidenceBadge}>
                    <Ionicons name="star" size={12} color={colors.secondary} />
                    <Text style={styles.confidenceText}>
                      {(lesson.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                  {lesson.positive !== undefined && (
                    <View style={[styles.metaBadge, lesson.positive ? styles.metaBadgePositive : styles.metaBadgeWarning]}>
                      <Ionicons 
                        name={lesson.positive ? "checkmark-circle" : "warning"} 
                        size={12} 
                        color={lesson.positive ? colors.primary : colors.warning} 
                      />
                      <Text style={styles.metaText}>
                        {lesson.positive ? 'Positive' : 'Warning'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Lesson Content */}
              <View style={styles.lessonContent}>
                <Text style={styles.lessonText}>{lesson.text}</Text>
              </View>

              {/* Tags */}
              {lesson.tags && lesson.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {lesson.tags.map((tag, tagIndex) => (
                    <View key={tagIndex} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

            </View>
            );
          })
          ) : (
            /* Show "no lessons" message when polling stopped but no playbook */
            <View style={styles.playbookGeneratingContainer}>
              <Ionicons name="sparkles" size={48} color={colors.muted} />
              <Text style={styles.playbookGeneratingText}>
                No lessons extracted
              </Text>
              <Text style={styles.playbookGeneratingSubtext}>
                AI-extracted lessons will appear here once they're generated
              </Text>
            </View>
          )}

          {/* Page Navigation - Minimalistic */}
          {showPlaybookContent && totalPages > 1 && (
            <View style={styles.pageNavigation}>
              <TouchableOpacity
                style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
                onPress={goToPreviousPage}
                disabled={currentPage === 0}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={18} 
                  color={currentPage === 0 ? colors.muted : colors.secondary} 
                />
                <Text style={[styles.navButtonText, currentPage === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                {currentPage + 1} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
                onPress={goToNextPage}
                disabled={currentPage === totalPages - 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.navButtonText, currentPage === totalPages - 1 && styles.navButtonTextDisabled]}>
                  Next
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={18} 
                  color={currentPage === totalPages - 1 ? colors.muted : colors.secondary} 
                />
              </TouchableOpacity>
            </View>
          )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Wrap with ErrorBoundary
export default function FullProfileScreen() {
  return (
    <ErrorBoundary>
      <FullProfileScreenContent />
    </ErrorBoundary>
  );
}

// Profile Stat Card Component - Matching homepage ProgressSummary style
interface ProfileStatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  cardWidth: number;
}

const ProfileStatCard: React.FC<ProfileStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  cardWidth,
}) => {
  const fontSize = useMemo(() => {
    if (cardWidth < 100) {
      return { title: 9, value: 14, subtitle: 8, icon: 10 };
    } else if (cardWidth < 120) {
      return { title: 10, value: 16, subtitle: 8, icon: 11 };
    } else {
      return { title: 11, value: 18, subtitle: 9, icon: 12 };
    }
  }, [cardWidth]);

  const iconBadgeBackground = createColorWithOpacity(colors.secondary, 0.18);
  const iconBadgeBorder = createColorWithOpacity(colors.secondary, 0.35);
  const primaryTextColor = colors.primary;
  const secondaryTextColor = createColorWithOpacity(colors.primary, 0.65);

  return (
    <View style={[styles.profileCard, { width: cardWidth }]}> 
      <View style={styles.profileCardContent}>
        <View
          style={[styles.iconBadge, {
            backgroundColor: iconBadgeBackground,
            borderColor: iconBadgeBorder,
          }]}
        >
          <Ionicons
            name={icon}
            size={fontSize.icon + 4}
            color={primaryTextColor}
          />
        </View>

        <Text
          style={[styles.profileValue, {
            fontSize: fontSize.value + 4,
            color: primaryTextColor,
          }]}
          numberOfLines={1}
        >
          {value}
        </Text>

        <View style={styles.profileTextContainer}>
          <Text
            style={[styles.profileTitle, {
              fontSize: fontSize.title,
              color: primaryTextColor,
            }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.profileSubtitle, {
              fontSize: fontSize.subtitle,
              color: secondaryTextColor,
            }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
    marginTop: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
  },
  playbookGeneratingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    minHeight: 300,
    gap: 16,
  },
  playbookGeneratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  playbookGeneratingSubtext: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  // Profile Cards - Matching homepage style
  profileCards: {
    flexDirection: 'row',
    marginVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  profileCard: {
    borderRadius: 14,
    backgroundColor: colors.card,
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.45),
    minWidth: 80,
  },
  profileCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 80,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
  },
  profileTextContainer: {
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  profileTitle: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: 0.5,
  },
  profileValue: {
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  profileSubtitle: {
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '600',
  },
  // Playbook Section
  playbookSection: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: createColorWithOpacity(colors.secondary, 0.15),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  headerGradient: {
    // No border
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  sectionTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  headerAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 12,
    maxWidth: 180,
  },
  playbookBadge: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.15),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
  },
  playbookBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 24,
    minHeight: 0,
  },
  // Lesson Card - Minimalistic
  lessonCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: createColorWithOpacity(colors.text, 0.08),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 300,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: createColorWithOpacity(colors.secondary, 0.2),
  },
  lessonNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: createColorWithOpacity(colors.secondary, 0.18),
    borderWidth: 1.5,
    borderColor: createColorWithOpacity(colors.secondary, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  lessonHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.secondary, 0.15),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
    gap: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: createColorWithOpacity(colors.muted, 0.1),
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  metaBadgePositive: {
    backgroundColor: createColorWithOpacity(colors.primary, 0.1),
  },
  metaBadgeWarning: {
    backgroundColor: createColorWithOpacity(colors.warning, 0.1),
  },
  metaText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  lessonContent: {
    flex: 1,
    marginBottom: 16,
  },
  lessonText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '400',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: createColorWithOpacity(colors.secondary, 0.12),
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.25),
  },
  tagText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  // Page Navigation - Minimalistic
  pageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: createColorWithOpacity(colors.secondary, 0.3),
  },
  navButtonDisabled: {
    opacity: 0.4,
    borderColor: createColorWithOpacity(colors.muted, 0.2),
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  navButtonTextDisabled: {
    color: colors.muted,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bottomSpacing: {
    height: 20,
  },
});

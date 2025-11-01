/**
 * Full Profile Screen - Complete user profile display
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/constants/colors';

const LESSONS_PER_PAGE = 1; // Show 1 lesson per page for book-like experience

const FullProfileScreen: React.FC = () => {
  const router = useRouter();
  const { state } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  const handleBackPress = () => {
    router.back();
  };

  const formatValue = (value: any, unit?: string) => {
    if (value === null || value === undefined || value === '') {
      return 'Not set';
    }
    return unit ? `${value} ${unit}` : value;
  };

  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    return value ? 'Yes' : 'No';
  };

  // Sort lessons by confidence (highest first) and paginate
  const sortedLessons = useMemo(() => {
    if (!state.userProfile?.playbook?.lessons) return [];
    return [...state.userProfile.playbook.lessons].sort((a, b) => b.confidence - a.confidence);
  }, [state.userProfile?.playbook?.lessons]);

  const totalPages = Math.ceil(sortedLessons.length / LESSONS_PER_PAGE);
  const currentLessons = sortedLessons.slice(
    currentPage * LESSONS_PER_PAGE,
    (currentPage + 1) * LESSONS_PER_PAGE
  );

  // Reset to first page when playbook changes
  useEffect(() => {
    setCurrentPage(0);
  }, [state.userProfile?.playbook?.lessons?.length]);

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <View style={styles.statusBarPadding} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Full Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Username</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.username)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{formatValue(state.user?.email)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Age</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.age, 'years')}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Gender</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.gender)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Height</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.height, state.userProfile?.heightUnit)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Weight</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.weight, state.userProfile?.weightUnit)}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Experience Level</Text>
              <Text style={styles.profileValue}>{formatValue(state.userProfile?.experienceLevel)}</Text>
            </View>
          </View>

          {/* AI Playbook */}
          {state.userProfile?.playbook && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Playbook</Text>
              
              {sortedLessons.length > 0 && (
                <View style={styles.bookContainer}>
                  {/* Book Page */}
                  <View style={styles.bookPage}>
                    {currentLessons.map((lesson, index) => (
                      <View key={lesson.id || index} style={styles.lessonPage}>
                        {/* Page Header */}
                        <View style={styles.pageHeader}>
                          <Text style={styles.pageNumber}>
                            Page {currentPage + 1} of {totalPages}
                          </Text>
                          <View style={styles.confidenceBadge}>
                            <Ionicons name="star" size={12} color={colors.primary} />
                            <Text style={styles.confidenceText}>
                              {(lesson.confidence * 100).toFixed(0)}%
                            </Text>
                          </View>
                        </View>

                        {/* Lesson Text */}
                        <View style={styles.pageContent}>
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

                        {/* Lesson Footer */}
                        <View style={styles.pageFooter}>
                          <View style={styles.lessonMetaRow}>
                            <View style={styles.metaItem}>
                              <Ionicons 
                                name={lesson.positive ? "checkmark-circle" : "warning"} 
                                size={14} 
                                color={lesson.positive ? colors.primary : colors.error} 
                              />
                              <Text style={styles.metaText}>
                                {lesson.positive ? 'Positive' : 'Warning'}
                              </Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Ionicons name="refresh" size={14} color={colors.muted} />
                              <Text style={styles.metaText}>
                                Applied {lesson.times_applied || 0}x
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Page Navigation */}
                  {totalPages > 1 && (
                    <View style={styles.pageNavigation}>
                      <TouchableOpacity
                        style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                        onPress={goToPreviousPage}
                        disabled={currentPage === 0}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name="chevron-back" 
                          size={20} 
                          color={currentPage === 0 ? colors.muted : colors.text} 
                        />
                        <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>
                          Previous
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.pageIndicator}>
                        {currentPage + 1} / {totalPages}
                      </Text>

                      <TouchableOpacity
                        style={[styles.pageButton, currentPage === totalPages - 1 && styles.pageButtonDisabled]}
                        onPress={goToNextPage}
                        disabled={currentPage === totalPages - 1}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.pageButtonText, currentPage === totalPages - 1 && styles.pageButtonTextDisabled]}>
                          Next
                        </Text>
                        <Ionicons 
                          name="chevron-forward" 
                          size={20} 
                          color={currentPage === totalPages - 1 ? colors.muted : colors.text} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Stats Below Book */}
              <View style={styles.playbookStats}>
                <View style={styles.statItem}>
                  <Ionicons name="book" size={16} color={colors.primary} />
                  <Text style={styles.statLabel}>Total Lessons</Text>
                  <Text style={styles.statValue}>
                    {state.userProfile.playbook.total_lessons || state.userProfile.playbook.lessons?.length || 0}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={styles.statLabel}>Last Updated</Text>
                  <Text style={styles.statValue}>
                    {state.userProfile.playbook.last_updated
                      ? new Date(state.userProfile.playbook.last_updated).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Additional Notes */}
          {state.userProfile?.finalChatNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Coach Notes</Text>
                <Text style={styles.profileValue}>{formatValue(state.userProfile?.finalChatNotes)}</Text>
              </View>
            </View>
          )}

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Member Since</Text>
              <Text style={styles.profileValue}>
                {state.userProfile?.createdAt 
                  ? new Date(state.userProfile.createdAt).toLocaleDateString()
                  : 'Not available'
                }
              </Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Last Updated</Text>
              <Text style={styles.profileValue}>
                {state.userProfile?.updatedAt 
                  ? new Date(state.userProfile.updatedAt).toLocaleDateString()
                  : 'Not available'
                }
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBarPadding: {
    height: Platform.OS === 'ios' ? 0 : RNStatusBar.currentHeight || 0,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
    flex: 1,
    marginRight: 16,
  },
  profileValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
  bookContainer: {
    marginTop: 12,
  },
  bookPage: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    minHeight: 300,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.overlay,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonPage: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  pageNumber: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  pageContent: {
    flex: 1,
    marginBottom: 16,
  },
  lessonText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    fontWeight: '400',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 6,
  },
  tag: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  pageFooter: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  lessonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  pageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  pageButtonTextDisabled: {
    color: colors.muted,
  },
  pageIndicator: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  playbookStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});

export default FullProfileScreen;

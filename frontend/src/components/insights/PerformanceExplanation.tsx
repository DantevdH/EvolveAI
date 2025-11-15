import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';

export const PerformanceExplanation: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="information-circle" size={16} color={colors.primary} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.content}>
                <View style={styles.closeButtonContainer}>
                  <Text style={styles.sectionTitle}>Effective Training Index</Text>
                  <TouchableOpacity 
                    onPress={() => setIsVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              
              <View style={styles.componentItem}>
                <Ionicons name="fitness" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Training Effort</Text>
                  <Text style={styles.componentDescription}>
                    Measures how much you lifted compared to your usual amount. Focuses on relative progress, not just total weight.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Training Consistency</Text>
                  <Text style={styles.componentDescription}>
                    How many days you trained this week. More consistent training leads to better results.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Strength Progress</Text>
                  <Text style={styles.componentDescription}>
                    Tracks if you're actually getting stronger. Compares your current max strength to your previous week's max.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="warning" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Recovery & Fatigue</Text>
                  <Text style={styles.componentDescription}>
                    Checks if you're training too hard or if your sessions feel too difficult. Helps prevent overtraining and injury.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>What Your Score Means:</Text>
              
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreRange, { color: colors.success }]}>80-100</Text>
                <Text style={styles.scoreDescription}>Great week! You're training effectively and making progress.</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreRange, { color: colors.warning }]}>60-79</Text>
                <Text style={styles.scoreDescription}>Good week with room for small improvements. Maybe increase intensity or consistency slightly.</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreRange, { color: colors.error }]}>0-59</Text>
                <Text style={styles.scoreDescription}>Needs attention. Consider adjusting your training load, rest days, or workout plan.</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    gap: 16,
  },
  closeButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  componentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  componentText: {
    flex: 1,
  },
  componentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  componentDescription: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreRange: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 60,
  },
  scoreDescription: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
});
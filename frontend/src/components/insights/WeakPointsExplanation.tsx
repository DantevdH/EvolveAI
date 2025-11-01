import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';

export const WeakPointsExplanation: React.FC = () => {
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
                <Text style={styles.sectionTitle}>Muscle Strength Index</Text>
                <TouchableOpacity 
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.componentItem}>
                <Ionicons name="trending-up-outline" size={18} color={colors.warning} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Performance Plateau</Text>
                  <Text style={styles.componentDescription}>
                    Your strength or training volume has stayed the same for several weeks. Time to mix things up with new exercises or adjust your routine.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="trending-down" size={18} color={colors.error} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Declining Performance</Text>
                  <Text style={styles.componentDescription}>
                    Your training volume or strength has been decreasing over time. This might indicate you need more rest or to adjust your approach.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Inconsistent Training</Text>
                  <Text style={styles.componentDescription}>
                    You're not training this muscle group regularly enough. More consistent weekly training will lead to better results.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="time-outline" size={18} color={colors.muted} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Low Training Frequency</Text>
                  <Text style={styles.componentDescription}>
                    This muscle group hasn't been trained enough in recent weeks. Aim for at least twice per month for better progress.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>What Your Score Means:</Text>
              
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                <Text style={[styles.scoreRange, { color: "#2E7D32" }]}>80+</Text>
                <Text style={styles.scoreDescription}>Excellent - This muscle group is performing excellently</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#81C784" />
                <Text style={[styles.scoreRange, { color: "#81C784" }]}>60-80</Text>
                <Text style={styles.scoreDescription}>Good - This muscle group is performing well</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text style={[styles.scoreRange, { color: colors.warning }]}>40-60</Text>
                <Text style={styles.scoreDescription}>Fair - Room for improvement in this muscle group</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="warning" size={16} color="#FF6B6B" />
                <Text style={[styles.scoreRange, { color: "#FF6B6B" }]}>20-40</Text>
                <Text style={styles.scoreDescription}>Weak - This muscle group needs attention soon</Text>
              </View>

              <View style={styles.scoreItem}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.scoreRange, { color: colors.error }]}>{"<"}20</Text>
                <Text style={styles.scoreDescription}>Very Weak - This muscle group needs immediate attention</Text>
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

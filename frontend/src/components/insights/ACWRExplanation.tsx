/**
 * ACWR Explanation Modal Component
 * 
 * Explains the Acute:Chronic Workload Ratio (ACWR) used for recovery calculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';

export const ACWRExplanation: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={styles.infoButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
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
          <TouchableOpacity 
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={() => setIsVisible(false)}
          />
          <View style={styles.dialog}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.closeButtonContainer}>
                <Text style={styles.sectionTitle}>Acute:Chronic Workload Ratio (ACWR)</Text>
                <TouchableOpacity 
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.componentItem}>
                <Ionicons name="calculator-outline" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>What is ACWR?</Text>
                  <Text style={styles.componentDescription}>
                    The Acute:Chronic Workload Ratio compares your recent training load (last 7 days) to your average training load (last 28 days). This helps determine if you're training at an optimal intensity or risking injury.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Ready ({'<'} 1.2)</Text>
                  <Text style={styles.componentDescription}>
                    Your recent training load (last 7 days) is at or below your 28-day average. This muscle group is fully recovered and ready for training. You can train at full intensity with low injury risk. This includes both well-rested states (lower load) and optimal training zones (matching your average).
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Elevated Load (1.2 - 1.5)</Text>
                  <Text style={styles.componentDescription}>
                    Your recent training load (last 7 days) is higher than your 28-day average. This muscle group is still recovering from the increased training. Light training is okay, but avoid high intensity until the load returns to the optimal range.
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="warning" size={18} color={colors.error} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Needs Rest ({'>'} 1.5)</Text>
                  <Text style={styles.componentDescription}>
                    Your recent training load (last 7 days) is significantly higher than your 28-day average. This means you've been training this muscle much more than usual, which increases injury risk. Consider reducing intensity or taking a rest day.
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>How It Works:</Text>
              
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  <Text style={styles.boldText}>Acute Load:</Text> Total training volume for this muscle group in the last 7 days{'\n\n'}
                  <Text style={styles.boldText}>Chronic Load:</Text> Average training volume for this muscle group over the last 28 days{'\n\n'}
                  <Text style={styles.boldText}>ACWR =</Text> Acute Load ÷ Chronic Load
                </Text>
              </View>
            </ScrollView>
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
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },
  scrollView: {
    maxHeight: 500,
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
  infoBox: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    color: colors.text,
  },
});


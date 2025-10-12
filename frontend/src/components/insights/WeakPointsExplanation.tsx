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
                <TouchableOpacity 
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.sectionTitle}>AI Analysis Methodology:</Text>
              
              <View style={styles.componentItem}>
                <Ionicons name="trending-up-outline" size={18} color={colors.warning} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Performance Plateau</Text>
                  <Text style={styles.componentDescription}>
                    AI pattern recognition identifies plateau trends
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="trending-down" size={18} color={colors.error} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Declining Performance</Text>
                  <Text style={styles.componentDescription}>
                    AI detects declining performance patterns
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Inconsistent Training</Text>
                  <Text style={styles.componentDescription}>
                    AI analyzes training consistency patterns
                  </Text>
                </View>
              </View>

              <View style={styles.componentItem}>
                <Ionicons name="time-outline" size={18} color={colors.muted} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>Low Training Frequency</Text>
                  <Text style={styles.componentDescription}>
                    AI tracks training frequency patterns
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Severity Levels:</Text>
              
              <View style={styles.scoreItem}>
                <Ionicons name="warning" size={16} color={colors.error} />
                <Text style={[styles.scoreRange, { color: colors.error }]}>High</Text>
                <Text style={styles.scoreDescription}>Immediate attention needed</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text style={[styles.scoreRange, { color: colors.warning }]}>Medium</Text>
                <Text style={styles.scoreDescription}>Should be addressed soon</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.scoreRange, { color: colors.success }]}>Low</Text>
                <Text style={styles.scoreDescription}>Minor issue to monitor</Text>
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
    alignItems: 'flex-end',
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

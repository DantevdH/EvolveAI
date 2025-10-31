import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/constants/colors';

export const VolumeTrendExplanation: React.FC = () => {
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
                <Text style={styles.sectionTitle}>Volume Trend</Text>
                <TouchableOpacity 
                  onPress={() => setIsVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.componentItem}>
                <Ionicons name="stats-chart" size={18} color={colors.primary} />
                <View style={styles.componentText}>
                  <Text style={styles.componentTitle}>What is Training Volume?</Text>
                  <Text style={styles.componentDescription}>
                    Training volume is the total amount of weight lifted (weight × reps × sets) across all your exercises. It shows how much work you're doing overall.
                  </Text>
                </View>
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
});


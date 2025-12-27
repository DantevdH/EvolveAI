/**
 * Sport Filter Dropdown
 *
 * Segmented control / dropdown for filtering insights by sport type.
 * Only shows sports that the user has actually performed.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, createColorWithOpacity } from '@/src/constants/colors';
import { SportType, SPORT_TYPE_LABELS } from '@/src/services/performanceMetricsService';

// Sport type icons mapping
const SPORT_ICONS: Record<SportType, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell-outline',
  running: 'walk-outline',
  cycling: 'bicycle-outline',
  swimming: 'water-outline',
  rowing: 'boat-outline',
  hiking: 'trail-sign-outline',
  walking: 'footsteps-outline',
  elliptical: 'fitness-outline',
  stair_climbing: 'trending-up-outline',
  jump_rope: 'pulse-outline',
  other: 'ellipsis-horizontal-outline',
};

interface SportFilterDropdownProps {
  selectedSport: SportType;
  onSelectSport: (sport: SportType) => void;
  availableSports: SportType[];
}

export const SportFilterDropdown: React.FC<SportFilterDropdownProps> = ({
  selectedSport,
  onSelectSport,
  availableSports,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if a sport is available (has been performed)
  const isAvailable = (sport: SportType): boolean => {
    return availableSports.includes(sport);
  };

  // Get all sport types sorted: active first, then inactive, both alphabetically
  const allSports: SportType[] = (Object.keys(SPORT_TYPE_LABELS) as SportType[]).sort((a, b) => {
    const aAvailable = isAvailable(a);
    const bAvailable = isAvailable(b);
    
    // First sort by availability: active (true) comes before inactive (false)
    if (aAvailable !== bAvailable) {
      return aAvailable ? -1 : 1;
    }
    
    // Then sort alphabetically by label
    const labelA = SPORT_TYPE_LABELS[a] || a;
    const labelB = SPORT_TYPE_LABELS[b] || b;
    return labelA.localeCompare(labelB);
  });

  const getLabel = (sport: SportType): string => {
    return SPORT_TYPE_LABELS[sport] || sport;
  };

  const getIcon = (sport: SportType): keyof typeof Ionicons.glyphMap => {
    return SPORT_ICONS[sport] || 'ellipsis-horizontal-outline';
  };

  const handleSelect = (sport: SportType) => {
    // Only allow selection of available sports
    if (isAvailable(sport)) {
      onSelectSport(sport);
      setIsOpen(false);
    }
  };

  // If only a few available sports, show chips for all sports
  if (availableSports.length <= 4) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {allSports.map(sport => {
          const available = isAvailable(sport);
          const isSelected = selectedSport === sport;
          
          return (
            <TouchableOpacity
              key={sport}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                !available && styles.chipInactive,
              ]}
              onPress={() => available && onSelectSport(sport)}
              disabled={!available}
              activeOpacity={available ? 0.7 : 1}
            >
              <Ionicons
                name={getIcon(sport)}
                size={16}
                color={
                  isSelected 
                    ? colors.card 
                    : available 
                    ? colors.text 
                    : colors.muted
                }
                style={styles.chipIcon}
              />
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  !available && styles.chipTextInactive,
                ]}
              >
                {getLabel(sport)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  // Dropdown for many sports
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Ionicons
          name={getIcon(selectedSport)}
          size={18}
          color={colors.primary}
          style={styles.dropdownIcon}
        />
        <Text style={styles.dropdownButtonText}>{getLabel(selectedSport)}</Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={colors.muted}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sport</Text>
            <ScrollView style={styles.optionsList}>
              {allSports.map(sport => {
                const available = isAvailable(sport);
                const isSelected = selectedSport === sport;
                
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.optionItem,
                      isSelected && styles.optionItemSelected,
                      !available && styles.optionItemInactive,
                    ]}
                    onPress={() => handleSelect(sport)}
                    disabled={!available}
                    activeOpacity={available ? 0.7 : 1}
                  >
                    <Ionicons
                      name={getIcon(sport)}
                      size={20}
                      color={
                        isSelected 
                          ? colors.primary 
                          : available 
                          ? colors.text 
                          : colors.muted
                      }
                      style={styles.optionIcon}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                        !available && styles.optionTextInactive,
                      ]}
                    >
                      {getLabel(sport)}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  chipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipInactive: {
    opacity: 0.5,
    borderColor: colors.muted,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.card,
  },
  chipTextInactive: {
    color: colors.muted,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxHeight: '60%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionItemSelected: {
    backgroundColor: `${colors.primary}15`,
  },
  optionItemInactive: {
    opacity: 0.5,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionTextInactive: {
    color: colors.muted,
  },
});

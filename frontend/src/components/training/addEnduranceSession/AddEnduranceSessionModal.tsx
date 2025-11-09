// Add Endurance Session Modal - Form for adding endurance sessions
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { SportTypePicker } from '../addExerciseModal/SportTypePicker';
import { HeartRateZoneSelector } from '../addExerciseModal/HeartRateZoneSelector';
import { DurationInput } from './DurationInput';
import { getAvailableUnits } from '../addExerciseModal/constants';
import { AddEnduranceSessionModalProps } from './types';

const AddEnduranceSessionModal: React.FC<AddEnduranceSessionModalProps> = ({
  visible,
  onClose,
  onAddSession,
}) => {
  const { state: authState } = useAuth();
  const isMetric = authState.userProfile?.weightUnit !== 'lbs';
  const availableUnits = getAvailableUnits(isMetric);

  const [sportType, setSportType] = useState<string>('running');
  const [duration, setDuration] = useState<string>('30');
  const [unit, setUnit] = useState<string>(availableUnits[0]);
  const [heartRateZone, setHeartRateZone] = useState<number>(3);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showSportTypePicker, setShowSportTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const handleAdd = () => {
    if (!sportType) {
      Alert.alert('Validation Error', 'Please select a sport type');
      return;
    }

    const volume = parseFloat(duration);
    if (isNaN(volume) || volume <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration');
      return;
    }

    if (heartRateZone < 1 || heartRateZone > 5) {
      Alert.alert('Validation Error', 'Heart rate zone must be between 1 and 5');
      return;
    }

    onAddSession({
      sportType,
      trainingVolume: volume,
      unit,
      heartRateZone,
      name: name.trim() || undefined,
      description: description.trim() || undefined,
    });

    // Reset form
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSportType('running');
    setDuration('30');
    setUnit(availableUnits[0]);
    setHeartRateZone(3);
    setName('');
    setDescription('');
    setShowSportTypePicker(false);
    setShowUnitPicker(false);
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Endurance Session</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Sport Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Sport Type *</Text>
            <SportTypePicker
              sportType={sportType || 'running'}
              onSelect={(type) => {
                setSportType(type);
                setShowSportTypePicker(false);
              }}
              showPicker={showSportTypePicker}
              onTogglePicker={() => setShowSportTypePicker(!showSportTypePicker)}
            />
          </View>

          {/* Duration */}
          <DurationInput
            duration={duration}
            unit={unit}
            availableUnits={availableUnits}
            showUnitPicker={showUnitPicker}
            onDurationChange={setDuration}
            onUnitChange={setUnit}
            onToggleUnitPicker={() => setShowUnitPicker(!showUnitPicker)}
          />

          {/* Heart Rate Zone */}
          <View style={styles.field}>
            <Text style={styles.label}>Heart Rate Zone (1-5)</Text>
            <HeartRateZoneSelector
              heartRateZone={heartRateZone}
              onSelect={setHeartRateZone}
            />
          </View>

          {/* Name (Optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>Name (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Morning Run"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Description (Optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add any notes about this session..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>Add Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.muted,
  },
  pickerOptions: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.background,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default AddEnduranceSessionModal;


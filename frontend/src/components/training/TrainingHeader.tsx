// Training Header Component - Progress ring only
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import ProgressRing from './ProgressRing';
import { TrainingHeaderProps } from '../../types/training';

const TrainingHeader: React.FC<TrainingHeaderProps> = ({
  progressRing,
}) => {
  if (!progressRing) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <ProgressRing
          progress={progressRing.progress}
          total={progressRing.total}
          completed={progressRing.completed}
          size={44}
          strokeWidth={4}
          color={progressRing.color}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingVertical: 20,
    marginTop: 0,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
});

export default TrainingHeader;

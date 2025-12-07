/**
 * Nutrition Tab - File-based routing for Expo Router
 * Placeholder screen (nutrition feature not yet implemented)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NutritionTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Nutrition feature coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});


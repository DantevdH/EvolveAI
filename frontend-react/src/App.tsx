import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
// import {GestureHandlerRootView} from 'react-native-gesture-handler';
// import {StyleSheet} from 'react-native';

import {AppNavigator} from '@/navigation/AppNavigator';
import {AppProvider} from '@/context/AppContext';

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
};

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });

export default App;

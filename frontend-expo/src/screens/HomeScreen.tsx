import { SafeAreaView, StyleSheet, Text, View } from 'react-native';;
import {useAuth} from '@/src/context/AuthContext';

export const HomeScreen: React.FC = () => {
  const {state: authState} = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to EvolveAI</Text>
        <Text style={styles.subtitle}>
          Your personal fitness journey starts here
        </Text>
        {authState.userProfile && (
          <Text style={styles.welcomeText}>Hello, {authState.userProfile.username}!</Text>
        )}
        {authState.user && !authState.userProfile && (
          <Text style={styles.welcomeText}>Welcome, {authState.user.email}!</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 20,
  },
});

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useAppContext} from '@/context/AppContext';
import {Button} from '@/components/Button';
import {Input} from '@/components/Input';
import {UserProfile} from '@/types';

export const LoginScreen: React.FC = () => {
  const {setAuthenticated, setUser} = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock successful login - create proper UserProfile
      const mockUser: UserProfile = {
        username: 'JohnDoe',
        primaryGoal: 'weight_loss',
        primaryGoalDescription: 'Lose 10 pounds and build muscle',
        experienceLevel: 'intermediate',
        daysPerWeek: 3,
        minutesPerSession: 45,
        equipment: 'dumbbells, resistance_bands',
        age: 30,
        weight: 75,
        weightUnit: 'kg',
        height: 175,
        heightUnit: 'cm',
        gender: 'male',
        hasLimitations: false,
        limitationsDescription: '',
        finalChatNotes: '',
        id: 1,
        userId: '1',
        coachId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setUser(mockUser);
      setAuthenticated(true);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
          />
          
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            style={styles.loginButton}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
    justifyContent: 'center',
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
    marginBottom: 40,
  },
  form: {
    marginBottom: 40,
  },
  loginButton: {
    marginTop: 20,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  signUpText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

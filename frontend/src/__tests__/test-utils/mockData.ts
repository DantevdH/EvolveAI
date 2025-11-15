/**
 * Mock data for testing
 */

export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'mock-access-token-123',
  refresh_token: 'mock-refresh-token-123',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

export const mockUserProfile = {
  id: 1,
  userId: 'test-user-id-123',
  username: 'TestUser',
  primaryGoal: 'Weight Loss',
  primaryGoalDescription: 'I want to lose 20 pounds',
  coachId: 1,
  experienceLevel: 'Beginner',
  daysPerWeek: 3,
  minutesPerSession: 45,
  equipment: 'Home Gym',
  age: 25,
  weight: 70,
  weightUnit: 'kg',
  height: 170,
  heightUnit: 'cm',
  gender: 'Male',
  hasLimitations: false,
  limitationsDescription: '',
  finalChatNotes: '',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockOnboardingData = {
  username: 'TestUser',
  primaryGoal: 'Weight Loss',
  goalDescription: 'I want to lose 20 pounds',
  experienceLevel: 'Beginner',
  daysPerWeek: 3,
  minutesPerSession: 45,
  equipment: 'Home Gym',
  age: 25,
  weight: 70,
  weightUnit: 'kg',
  height: 170,
  heightUnit: 'cm',
  gender: 'Male',
  hasLimitations: false,
  limitationsDescription: '',
  finalNotes: '',
  selectedCoachId: 1,
};

export const mockCoach = {
  id: 1,
  name: 'Coach Shift',
  goal: 'Weight Loss',
  iconName: 'flame.fill',
  tagline: 'Transforming habits, igniting your metabolism.',
  primaryColorHex: '#FF2D55',
};

export const mockAuthCredentials = {
  email: 'test@example.com',
  password: 'password123',
};

export const mockSignUpData = {
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

export const mockSupabaseResponse = {
  data: { user: mockUser, session: mockSession },
  error: null,
};

export const mockSupabaseError = {
  data: { user: null, session: null },
  error: { message: 'Invalid credentials' },
};

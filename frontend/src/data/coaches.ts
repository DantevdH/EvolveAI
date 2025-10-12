import { Coach } from '../services/coachService';

export const staticCoaches: Coach[] = [
  {
    id: 1,
    name: 'Coach Stride',
    goal: 'Improve Endurance',
    specialization: 'Endurance Training',
    bio: 'Going the distance, one step at a time.',
    experience_years: 8,
    certifications: ['Certified Running Coach', 'Endurance Specialist'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Coach Forge',
    goal: 'Bodybuilding',
    specialization: 'Muscle Building',
    bio: 'Sculpting strength, building legends.',
    experience_years: 12,
    certifications: ['Certified Personal Trainer', 'Bodybuilding Specialist'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Coach Titan',
    goal: 'Increase Strength',
    specialization: 'Strength Training',
    bio: 'Unleash your inner power.',
    experience_years: 10,
    certifications: ['Strength & Conditioning Specialist', 'Powerlifting Coach'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Coach Balance',
    goal: 'General training',
    specialization: 'Overall Wellness',
    bio: 'Your daily dose of wellness.',
    experience_years: 6,
    certifications: ['General training Trainer', 'Wellness Coach'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 5,
    name: 'Coach Shift',
    goal: 'Weight Loss',
    specialization: 'Fat Loss & Nutrition',
    bio: 'Transforming your energy.',
    experience_years: 9,
    certifications: ['Weight Loss Specialist', 'Nutrition Coach'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 6,
    name: 'Coach Bolt',
    goal: 'Power & Speed',
    specialization: 'Athletic Performance',
    bio: 'Ignite your potential.',
    experience_years: 7,
    certifications: ['Speed & Agility Coach', 'Athletic Performance Specialist'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Additional metadata for UI purposes
export const coachMetadata = {
  1: { icon: 'figure.run', color: '#007AFF', tagline: 'Going the distance, one step at a time.' },
  2: { icon: 'dumbbell.fill', color: '#FF9500', tagline: 'Sculpting strength, building legends.' },
  3: { icon: 'flame.fill', color: '#FF3B30', tagline: 'Unleash your inner power.' },
  4: { icon: 'heart.fill', color: '#428044', tagline: 'Your daily dose of wellness.' },
  5: { icon: 'scalemass.fill', color: '#7F1093', tagline: 'Transforming your energy.' },
  6: { icon: 'bolt.fill', color: '#1AD1DD', tagline: 'Ignite your potential.' }
};

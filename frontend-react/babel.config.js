module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/screens': './src/screens',
          '@/navigation': './src/navigation',
          '@/services': './src/services',
          '@/utils': './src/utils',
          '@/hooks': './src/hooks',
          '@/context': './src/context',
          '@/types': './src/types',
          '@/constants': './src/constants',
          '@/assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin', // This needs to be last
  ],
};

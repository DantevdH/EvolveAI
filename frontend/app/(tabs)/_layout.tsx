import { Tabs } from 'expo-router';
import React from 'react';
import FloatingTabBar from '@/components/FloatingTabBar';

export default function TabLayout() {
  return (
    <>
    <Tabs
        // Hide the default tab bar completely
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
            display: 'none',
            height: 0,
            position: 'absolute',
          backgroundColor: 'transparent',
          },
          // Critical: Remove any safe area padding
          tabBarItemStyle: {
            display: 'none',
        },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journey',
            tabBarButton: () => null, // Don't render any button
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
            tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
            tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
            tabBarButton: () => null,
        }}
      />
    </Tabs>
      {/* Custom floating tab bar */}
      <FloatingTabBar />
    </>
  );
}

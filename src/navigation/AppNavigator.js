import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from '../lib/supabase';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import GarageScreen from '../screens/GarageScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import DiagnoseScreen from '../screens/DiagnoseScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AddServiceScreen from '../screens/AddServiceScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AIChatScreen from '../screens/AIChatScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0f1a',
          borderTopColor: 'rgba(255,255,255,0.07)',
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🚗" focused={focused} />, tabBarLabel: 'Garage' }}
      />
      <Tab.Screen
        name="Diagnose"
        component={DiagnoseScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />, tabBarLabel: 'Diagnose' }}
      />
      <Tab.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} />, tabBarLabel: 'AI Chat' }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />, tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />, tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Onboarding');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setInitialRoute(session ? 'Main' : 'Onboarding');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // handled via navigation
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0f1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
        <Stack.Screen name="AddService" component={AddServiceScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

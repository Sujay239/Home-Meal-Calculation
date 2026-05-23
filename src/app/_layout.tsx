import React from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LoginScreen } from '@/components/login-screen';
import { CustomTabBar } from '@/components/custom-tab-bar';
import { useAuth } from '@/hooks/use-auth';
import { useRoommates } from '@/hooks/use-shared-data';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, login } = useAuth();
  
  // Eagerly fetch master data in the background once authenticated
  useRoommates();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {!isLoading && (
        isAuthenticated ? (
          <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
              }}
            />
            <Tabs.Screen
              name="purchases"
              options={{
                title: 'Purchases',
              }}
            />
            <Tabs.Screen
              name="cart"
              options={{
                title: 'Cart',
                href: null,
              }}
            />
            <Tabs.Screen
              name="meals"
              options={{
                title: 'Meals',
              }}
            />
            <Tabs.Screen
              name="account"
              options={{
                title: 'Account',
              }}
            />
          </Tabs>
        ) : (
          <LoginScreen onLoginSuccess={(token, user) => login(token, user)} />
        )
      )}
    </ThemeProvider>
  );
}

/* eslint-disable react-hooks/immutability */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemedText } from './themed-text';
import { authService } from '@/services/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;


interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation values
  const buttonScale = useSharedValue(1);
  const cardShake = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  // States for focused outlines
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setError('');

    // Basic validation
    if (!username.trim() || !password.trim()) {
      shakeCard();
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await authService.login(username.trim(), password);

      if (data.success) {
        // Animate card fading out before success callback
        cardOpacity.value = withTiming(0, { duration: 300 }, (isFinished) => {
          if (isFinished) {
            runOnJS(onLoginSuccess)(data.token, data.user);
          }
        });
      } else {
        shakeCard();
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      console.error('Login request error:', err);
      shakeCard();
      setError(err.message || 'Cannot connect to authentication server. Please ensure the backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shakeCard = () => {
    cardShake.value = withSequence(
      withTiming(-12, { duration: 80, easing: Easing.linear }),
      withTiming(12, { duration: 80, easing: Easing.linear }),
      withTiming(-8, { duration: 80, easing: Easing.linear }),
      withTiming(8, { duration: 80, easing: Easing.linear }),
      withTiming(0, { duration: 80, easing: Easing.linear })
    );
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardShake.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pressIn = () => {
    buttonScale.value = withTiming(0.96, { duration: 100 });
  };

  const pressOut = () => {
    buttonScale.value = withTiming(1, { duration: 150 });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#208AEF', '#005da8', '#f8f9ff']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.loginCard, cardAnimatedStyle]}>
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="account-balance-wallet" size={32} color="#005da8" />
            </View>
            <ThemedText style={styles.appTitle}>Meal Calculation</ThemedText>
            <ThemedText style={styles.appSubtitle}>Secure Fintech Ledger Portal</ThemedText>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={16} color="#BA1A1A" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Username Field */}
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.inputLabel}>Username</ThemedText>
              <View
                style={[
                  styles.inputFieldContainer,
                  userFocused && styles.inputFocused,
                ]}
              >
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color={userFocused ? '#005da8' : '#717784'}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your username"
                  placeholderTextColor="rgba(11,28,48,0.4)"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setUserFocused(true)}
                  onBlur={() => setUserFocused(false)}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
              <ThemedText style={styles.inputLabel}>Password</ThemedText>
              <View
                style={[
                  styles.inputFieldContainer,
                  passFocused && styles.inputFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={passFocused ? '#005da8' : '#717784'}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(11,28,48,0.4)"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  style={styles.visibilityButton}
                >
                  <MaterialIcons
                    name={isPasswordVisible ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#717784"
                  />
                </Pressable>
              </View>
            </View>

            {/* Hint Box (Thoughtful UX Helper) */}
            

            {/* Login Action Button */}
            <Pressable
              onPress={handleLogin}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={isSubmitting}
              style={styles.pressableWrapper}
            >
              <Animated.View style={[styles.loginButton, buttonAnimatedStyle, isSubmitting && { opacity: 0.8 }]}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
                    <MaterialIcons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: SCREEN_HEIGHT || 700,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 28,
    paddingVertical: 36,
    ...Platform.select({
      ios: {
        shadowColor: '#005da8',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 16px 40px 0 rgba(0, 93, 168, 0.15)',
      },
    }),
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#005da8',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#53606c',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#BA1A1A',
    marginLeft: 6,
    flex: 1,
  },
  formContainer: {
    gap: 20,
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#53606c',
    paddingLeft: 2,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(113, 119, 132, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
  },
  inputFocused: {
    borderColor: '#005da8',
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 3px rgba(32, 138, 239, 0.15)',
      },
    }),
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0b1c30',
    height: '100%',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  visibilityButton: {
    padding: 4,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(83, 96, 108, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 2,
  },
  hintText: {
    fontSize: 11.5,
    color: '#53606c',
    flex: 1,
  },
  boldHint: {
    fontWeight: '700',
    color: '#005da8',
    fontSize: 11.5,
  },
  pressableWrapper: {
    width: '100%',
  },
  loginButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#005da8',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#005da8',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

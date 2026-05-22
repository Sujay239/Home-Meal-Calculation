import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text, Platform, Modal, TextInput, KeyboardAvoidingView, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { notifyPurchaseAdded } from '@/hooks/use-shared-data';
import { useAuth } from '@/hooks/use-auth';
import Constants from 'expo-constants';
import { purchaseService } from '@/services/api';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { username, token, user } = useAuth();

  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const handleCartSubmit = async () => {
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }

    // Validate English language: letters, numbers, spaces, and basic punctuation
    const englishRegex = /^[A-Za-z0-9\s.,'()\-&!#]+$/;
    if (!englishRegex.test(trimmedName)) {
      Alert.alert('Not Supported', 'Only English characters are supported for the item name.');
      return;
    }

    const trimmedAmount = itemAmount.trim();
    if (!trimmedAmount) {
      Alert.alert('Error', 'Please enter an amount.');
      return;
    }

    const amountNum = parseFloat(trimmedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Amount must be a positive number.');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'You must be logged in to log a purchase.');
      return;
    }

    try {
      const data = await purchaseService.logPurchase({
        username: username || 'Sujay',
        product: trimmedName,
        price: amountNum,
      });

      if (data.success) {
        notifyPurchaseAdded();
        setItemName('');
        setItemAmount('');
        setCartModalVisible(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to save purchase.');
      }
    } catch (err: any) {
      console.error('Save purchase error:', err);
      Alert.alert('Error', err.message || 'Cannot connect to server. Please try again.');
    }
  };

  const handleCartCancel = () => {
    setItemName('');
    setItemAmount('');
    setCartModalVisible(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background === '#000000' 
            ? 'rgba(33, 34, 37, 0.92)' 
            : 'rgba(240, 240, 243, 0.92)',
          paddingBottom: Math.max(insets.bottom, Spacing.one),
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Determine icon name based on route name
        let iconName: keyof typeof MaterialIcons.glyphMap = 'home';
        let label = 'Home';

        if (route.name === 'index') {
          iconName = 'home';
          label = 'Home';
        } else if (route.name === 'purchases') {
          iconName = 'receipt-long';
          label = 'Purchases';
        } else if (route.name === 'cart') {
          iconName = 'shopping-cart';
          label = 'Cart';
        } else if (route.name === 'meals') {
          iconName = 'restaurant';
          label = 'Meals';
        } else if (route.name === 'account') {
          iconName = 'person';
          label = 'Account';
        }

        // Animated Button Scale on press
        const scale = useSharedValue(1);

        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scale.value }],
        }));

        const handlePressIn = () => {
          scale.value = withSpring(0.90, { damping: 12, stiffness: 220 });
        };

        const handlePressOut = () => {
          scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        };

        const tabLabel = options.title !== undefined ? options.title : label;

        // Custom render for Cart (index 2) — opens modal instead of navigating
        if (route.name === 'cart') {
          return (
            <Animated.View key={route.key} style={[styles.cartContainer, animatedStyle]}>
              <Pressable
                onPress={() => setCartModalVisible(true)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                  styles.cartButton,
                  {
                    shadowColor: '#2ed573',
                    backgroundColor: '#2ed573',
                  },
                ]}
              >
                <MaterialIcons name={iconName} size={28} color="#ffffff" />
              </Pressable>
            </Animated.View>
          );
        }

        const isAccountTab = route.name === 'account';

        return (
          <Animated.View key={route.key} style={[styles.tabButton, animatedStyle]}>
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.tabPressable}
            >
              {isAccountTab && user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={[
                    styles.tabAvatarImg,
                    { borderColor: isFocused ? '#2ed573' : 'transparent' }
                  ]}
                />
              ) : (
                <MaterialIcons
                  name={iconName}
                  size={22}
                  color={isFocused ? '#2ed573' : theme.textSecondary}
                />
              )}
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? '#2ed573' : theme.textSecondary },
                ]}
              >
                {tabLabel}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* Cart Modal */}
      <Modal
        visible={cartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCartCancel}
      >
        <View style={styles.modalContainer}>
          {/* Absolute Background Backdrop */}
          <Pressable style={styles.absoluteOverlay} onPress={handleCartCancel} />

          {/* Centered card content area with slide Avoidance */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingContainer}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>

              {/* Header with icon */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconCircle}>
                  <MaterialIcons name="add-shopping-cart" size={24} color="#fff" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Log Your Purchase</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Enter the item details below</Text>
              </View>

              {/* Inputs */}
              <View style={styles.modalForm}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Item Name</Text>
                <View style={[
                  styles.modalInputWrapper,
                  {
                    borderColor: isNameFocused ? '#2ed573' : theme.backgroundSelected,
                    backgroundColor: theme.background
                  }
                ]}>
                  <MaterialIcons name="shopping-bag" size={18} color={isNameFocused ? '#2ed573' : theme.textSecondary} />
                  <TextInput
                    style={[styles.modalInput, { color: theme.text }]}
                    placeholder="e.g. Rice, Vegetables..."
                    placeholderTextColor={theme.textSecondary}
                    value={itemName}
                    onChangeText={setItemName}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                  />
                </View>

                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Amount (₹ INR)</Text>
                <View style={[
                  styles.modalInputWrapper,
                  {
                    borderColor: isAmountFocused ? '#2ed573' : theme.backgroundSelected,
                    backgroundColor: theme.background
                  }
                ]}>
                  <Text style={{ color: isAmountFocused ? '#2ed573' : theme.textSecondary, fontSize: 16, fontWeight: '700' }}>₹</Text>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text }]}
                    placeholder="e.g. 250"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={itemAmount}
                    onChangeText={(text) => {
                      // Filter out anything that is not a digit or a decimal point
                      let cleanText = text.replace(/[^0-9.]/g, '');
                      
                      // Ensure there's at most one decimal point
                      const parts = cleanText.split('.');
                      if (parts.length > 2) {
                        cleanText = parts[0] + '.' + parts[1];
                      }
                      
                      setItemAmount(cleanText);
                    }}
                    onFocus={() => setIsAmountFocused(true)}
                    onBlur={() => setIsAmountFocused(false)}
                  />
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={handleCartCancel}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.modalCancelBtn,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCartSubmit}
                  style={({ pressed }) => [
                    styles.modalBtn,
                    styles.modalSubmitBtn,
                    pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <MaterialIcons name="check" size={18} color="#1a1a1a" style={{ marginRight: 4 }} />
                  <Text style={[styles.modalBtnText, { color: '#1a1a1a' }]}>Submit</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: 'visible',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  tabAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  cartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cartButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -38,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cartLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: Spacing.one,
    letterSpacing: 0.2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2ed573',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  modalForm: {
    gap: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {},
  modalSubmitBtn: {
    backgroundColor: '#2ed573',
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

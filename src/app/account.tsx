import React, { useState, useRef, useEffect } from 'react';
import { Platform, StyleSheet, View, Pressable, Switch, ScrollView, TextInput, Alert, Image } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import Constants from 'expo-constants';
import { userService } from '@/services/api';

export default function AccountScreen() {
  const theme = useTheme();
  const { username, user, token, logout, updateUser } = useAuth();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (user?.avatar) {
      setAvatarUri(user.avatar);
    } else {
      setAvatarUri(null);
    }
  }, [user]);

  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  const uploadAvatar = async (localUri: string) => {
    if (!token || !user) return;
    
    try {
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        
        try {
          const result = await userService.changeAvatar(base64Data);
          if (result.success) {
            Alert.alert('Success', 'Avatar updated successfully.');
            updateUser({
              ...user,
              avatar: base64Data,
            });
          } else {
            Alert.alert('Error', result.message || 'Failed to update avatar.');
          }
        } catch (err: any) {
          Alert.alert('Error', 'Connection error: ' + (err.message || err));
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to process image: ' + e.message);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await uploadAvatar(uri);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match.');
      return;
    }
    
    if (!token) {
      Alert.alert('Error', 'Not authenticated.');
      return;
    }

    try {
      const data = await userService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (data.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', data.message || 'Failed to change password.');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Connection error: ' + (err.message || err));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Account
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Manage your portion control & settings
          </ThemedText>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* User Profile Card */}
          <View style={styles.centeredProfileCard}>
            <Pressable onPress={pickImage} style={styles.largeAvatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {(username || 'Sujay').charAt(0).toUpperCase()}
                </ThemedText>
              )}
            </Pressable>
            <ThemedText type="default" style={styles.profileName}>
              {username || 'Sujay'}
            </ThemedText>
            <ThemedText type="small" style={{ opacity: 0.6 }}>
              {user?.role || 'user'}
            </ThemedText>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [
                styles.changeAvatarButton,
                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
              ]}
            >
              <MaterialIcons name="camera-alt" size={16} color="#2ed573" />
              <ThemedText style={styles.changeAvatarText}>Change Avatar</ThemedText>
            </Pressable>
          </View>

         



          {/* Security Settings Group */}
          <ThemedText type="default" style={styles.sectionHeader}>Security</ThemedText>
          <ThemedView type="backgroundElement" style={styles.settingsGroup}>
            <View style={styles.settingItemColumn}>
              <ThemedText type="small" style={styles.settingLabel}>Change Password</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Current Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="New Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Confirm New Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
                onPress={handleChangePassword}
              >
                <ThemedText style={styles.primaryButtonText}>Update Password</ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          {/* Action Log Out */}
          <Pressable
            onPress={logout}
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: 'rgba(255, 82, 82, 0.3)', backgroundColor: theme.backgroundElement },
              pressed && styles.logoutButtonPressed,
            ]}
          >
            <MaterialIcons name="logout" size={18} color="#FF5252" />
            <ThemedText type="smallBold" style={{ color: '#FF5252', fontSize: 15, marginLeft: Spacing.two }}>
              Sign Out
            </ThemedText>
          </Pressable>

          {/* App Version */}
          <ThemedText type="small" style={{ textAlign: 'center', opacity: 0.5, marginTop: Spacing.two }}>
            Version 1.0.0
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingVertical: Spacing.four,
    gap: Spacing.one,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.6,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  centeredProfileCard: {
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  largeAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2ed573',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: Spacing.one,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 56,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  profileName: {
    fontWeight: '700',
    fontSize: 24,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.one,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.4)',
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
  },
  changeAvatarText: {
    color: '#2ed573',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statBox: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 18,
    marginTop: Spacing.two,
    opacity: 0.9,
  },
  settingsGroup: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  settingLabel: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
  },
  logoutButton: {
    flexDirection: 'row',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  logoutButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  settingItemColumn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#2ed573',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#1a1a1a',
    fontWeight: '700',
    fontSize: 15,
  },
});

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme, Modal, ActivityIndicator, Alert, Platform, Image, TextInput, KeyboardAvoidingView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToPurchaseUpdates, useRoommates } from '@/hooks/use-shared-data';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { homeService, mealService, duesService } from '@/services/api';

const USER_COLORS: Record<string, string> = {
  'sujay': '#6366f1',
  'pritam kumar': '#f59e0b',
  'arghya': '#2ed573',
  'manas': '#ec4899',
  'biproteep': '#8b5cf6',
  'saikat': '#14b8a6',
  'admin': '#208AEF',
};

const getUserColor = (name: string) => USER_COLORS[name.toLowerCase().trim()] || '#64748b';

interface UserAggregation {
  id: number;
  username: string;
  role: string;
  avatar: string | null;
  expenses: number;
  meals: number;
}

interface DashboardData {
  global_total_spent: number;
  global_total_meals: number;
  per_meal_cost: number;
  users: UserAggregation[];
  currentUser: UserAggregation;
}

type Due = {
  id: number;
  username: string;
  lender_name: string;
  amount: number;
  subject: string;
  updated_at: string;
};

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { username, token } = useAuth();
  const { roommates, getAvatar } = useRoommates();
  
  // --- NAVIGATION / TABS ---
  const [activeTab, setActiveTab] = useState<'ledger' | 'settlements'>('ledger');

  // --- LEDGER STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // --- DUES STATE ---
  const [dues, setDues] = useState<Due[]>([]);
  const [isDuesLoading, setIsDuesLoading] = useState(false);
  const [duesError, setDuesError] = useState('');

  // --- ADD DUE FORM STATE ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [amount, setAmount] = useState('');
  const [settlementType, setSettlementType] = useState<'receive' | 'give'>('receive');
  const [selectedRoommate, setSelectedRoommate] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [isRoommateDropdownOpen, setIsRoommateDropdownOpen] = useState(false);

  const [isSubjectFocused, setIsSubjectFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isCustomNameFocused, setIsCustomNameFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to top on tab change or focus
  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [isFocused, activeTab]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setIsLoadingData(true);
    setFetchError('');
    try {
      const month = currentDate.getMonth() + 1; // 1-indexed
      const year = currentDate.getFullYear();
      
      const data = await homeService.getHomeData({ month, year });
      if (data.success) {
        setDashboardData(data);
      } else {
        setFetchError(data.message || 'Failed to fetch ledger data.');
      }
    } catch (err: any) {
      console.error('Fetch dashboard data error:', err);
      setFetchError(err.message || 'Cannot connect to calculation server. Please ensure the backend is running.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchDues = async () => {
    if (!token) return;
    setIsDuesLoading(true);
    setDuesError('');
    try {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const data = await duesService.getDues({ month, year });
      if (data.success) {
        setDues(data.dues || []);
      } else {
        setDuesError(data.message || 'Failed to fetch dues.');
      }
    } catch (err: any) {
      console.error('Fetch dues error:', err);
      setDuesError(err.message || 'Cannot connect to server.');
    } finally {
      setIsDuesLoading(false);
    }
  };

  // Fetch both datasets reactively
  useEffect(() => {
    if (isFocused && token) {
      fetchDashboardData();
      fetchDues();
    }
  }, [currentDate, token, isFocused]);

  useEffect(() => {
    if (!token) return;
    const unsubscribe = subscribeToPurchaseUpdates(() => {
      fetchDashboardData();
      fetchDues();
    });
    return unsubscribe;
  }, [token]);

  // Set default selected roommate once roommates load
  useEffect(() => {
    if (roommates.length > 0 && !selectedRoommate) {
      const defaultRoommate = roommates.find(r => r.username.toLowerCase().trim() !== username?.toLowerCase().trim());
      if (defaultRoommate) {
        setSelectedRoommate(defaultRoommate.username);
      } else {
        setSelectedRoommate('Other');
      }
    }
  }, [roommates, username]);

  // --- LOGIC ---
  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (!isCurrentMonth()) {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleLogMeal = async () => {
    setModalVisible(false);
    setIsLoadingData(true);
    try {
      if (!username) {
        Alert.alert('Error', 'Username not found.');
        return;
      }
      const data = await mealService.logMeal({ username });
      if (data.success) {
        fetchDashboardData();
      } else {
        Alert.alert('Error', data.message || 'Failed to log meal.');
      }
    } catch (err: any) {
      console.error('Log meal error:', err);
      Alert.alert('Error', err.message || 'Cannot connect to server. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle new settlement submit
  const handleAddSettlement = async () => {
    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      Alert.alert('Error', 'Please enter a subject or reason.');
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      Alert.alert('Error', 'Please enter an amount.');
      return;
    }

    const amountNum = parseFloat(trimmedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Amount must be a positive number.');
      return;
    }

    let otherUser = '';
    if (selectedRoommate === 'Other') {
      const trimmedCustom = customName.trim();
      if (!trimmedCustom) {
        Alert.alert('Error', 'Please enter the recipient/lender name.');
        return;
      }
      otherUser = trimmedCustom;
    } else {
      otherUser = selectedRoommate;
    }

    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await duesService.logDue({
        subject: trimmedSubject,
        amount: amountNum,
        type: settlementType,
        other_user: otherUser,
      });

      if (res.success) {
        Alert.alert('Success', 'Settlement logged successfully!');
        setSubject('');
        setAmount('');
        setCustomName('');
        // Retain roommate selection default
        const defaultRoommate = roommates.find(r => r.username.toLowerCase().trim() !== username?.toLowerCase().trim());
        setSelectedRoommate(defaultRoommate ? defaultRoommate.username : 'Other');
        setIsFormOpen(false);
        fetchDues();
      } else {
        Alert.alert('Error', res.message || 'Failed to save settlement.');
      }
    } catch (err: any) {
      console.error('Save due error:', err);
      Alert.alert('Error', err.message || 'Cannot connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete settlement
  const handleDeleteDue = (id: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this settlement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await duesService.deleteDue(id);
              if (res.success) {
                Alert.alert('Deleted', 'Settlement removed successfully.');
                fetchDues();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete settlement.');
              }
            } catch (err: any) {
              console.error('Delete due error:', err);
              Alert.alert('Error', err.message || 'Cannot connect to server.');
            }
          }
        }
      ]
    );
  };

  // Dynamic calculations based on backend database state (Ledger tab)
  const totalExpenses = dashboardData ? dashboardData.global_total_spent : 0;
  const totalMeals = dashboardData ? dashboardData.global_total_meals : 0;
  const perMealCost = dashboardData ? dashboardData.per_meal_cost : 0;

  const users = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.users
      .map(u => ({
        id: String(u.id),
        name: u.username,
        meals: u.meals,
        expenses: u.expenses,
        avatar: u.avatar,
      }))
      .filter(u => {
        const fairShare = perMealCost * u.meals;
        const rawPayment = fairShare - u.expenses;
        const roundedPayment = Math.round(rawPayment);
        return u.meals !== 0 || u.expenses !== 0 || roundedPayment !== 0;
      });
  }, [dashboardData, perMealCost]);

  const currentUser = useMemo(() => {
    if (!dashboardData) {
      return {
        id: '0',
        name: username || 'User',
        meals: 0,
        expenses: 0,
        avatar: null,
      };
    }
    return {
      id: String(dashboardData.currentUser.id),
      name: dashboardData.currentUser.username,
      meals: dashboardData.currentUser.meals,
      expenses: dashboardData.currentUser.expenses,
      avatar: dashboardData.currentUser.avatar,
    };
  }, [dashboardData, username]);

  // Calculate stats from dues (Settlements tab)
  const duesStats = useMemo(() => {
    let toReceive = 0;
    let toGive = 0;

    dues.forEach(d => {
      const isLender = d.lender_name.toLowerCase().trim() === username?.toLowerCase().trim();
      const isDebtor = d.username.toLowerCase().trim() === username?.toLowerCase().trim();
      
      if (isLender) {
        toReceive += parseFloat(d.amount.toString());
      } else if (isDebtor) {
        toGive += parseFloat(d.amount.toString());
      }
    });

    return {
      toReceive,
      toGive,
      net: toReceive - toGive
    };
  }, [dues, username]);

  const selectableRoommates = useMemo(() => {
    return roommates.filter(r => r.username.toLowerCase().trim() !== username?.toLowerCase().trim());
  }, [roommates, username]);

  if (isLoadingData && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2ed573" />
        <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>Loading ledger...</ThemedText>
      </SafeAreaView>
    );
  }

  if (fetchError && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <ThemedText type="subtitle" style={{ marginTop: 16, color: theme.text, textAlign: 'center' }}>Connection Failed</ThemedText>
        <ThemedText style={{ marginTop: 8, color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          {fetchError}
        </ThemedText>
        <Pressable 
          onPress={fetchDashboardData}
          style={{ backgroundColor: '#2ed573', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
        >
          <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* 1. Header with Dollar Sign Toggle Icon */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title">Home</ThemedText>
          <Pressable 
            onPress={() => setActiveTab(activeTab === 'ledger' ? 'settlements' : 'ledger')}
            style={({ pressed }) => [
              styles.navIconButton, 
              { backgroundColor: activeTab === 'settlements' ? '#6366f1' : theme.backgroundElement },
              pressed && { opacity: 0.7 }
            ]}
          >
            <MaterialIcons 
              name={activeTab === 'settlements' ? 'home' : 'attach-money'} 
              size={24} 
              color={activeTab === 'settlements' ? '#fff' : theme.text} 
            />
          </Pressable>
        </View>

        {/* Premium Inline Segmented Tab Switcher */}
        <View style={[styles.segmentedTabBar, { backgroundColor: theme.backgroundElement }]}>
          <Pressable 
            onPress={() => setActiveTab('ledger')}
            style={[
              styles.segmentTabItem,
              activeTab === 'ledger' && { backgroundColor: theme.background, borderColor: 'rgba(46, 213, 115, 0.1)', borderWidth: 1 }
            ]}
          >
            <MaterialIcons name="restaurant-menu" size={16} color={activeTab === 'ledger' ? '#2ed573' : theme.textSecondary} />
            <ThemedText style={[
              styles.segmentTabText,
              { color: activeTab === 'ledger' ? theme.text : theme.textSecondary, fontWeight: activeTab === 'ledger' ? '800' : '500' }
            ]}>
              Meals Ledger
            </ThemedText>
          </Pressable>
          
          <Pressable 
            onPress={() => setActiveTab('settlements')}
            style={[
              styles.segmentTabItem,
              activeTab === 'settlements' && { backgroundColor: theme.background, borderColor: 'rgba(99, 102, 241, 0.1)', borderWidth: 1 }
            ]}
          >
            <MaterialIcons name="account-balance" size={16} color={activeTab === 'settlements' ? '#6366f1' : theme.textSecondary} />
            <ThemedText style={[
              styles.segmentTabText,
              { color: activeTab === 'settlements' ? theme.text : theme.textSecondary, fontWeight: activeTab === 'settlements' ? '800' : '500' }
            ]}>
              Settlements
            </ThemedText>
          </Pressable>
        </View>

        {/* 2. Month Selector Navigation */}
        <View style={[styles.monthFilter, { backgroundColor: theme.backgroundElement }]}>
          <Pressable onPress={goToPreviousMonth} style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="default" style={styles.monthText}>{formatMonthYear(currentDate)}</ThemedText>
          <Pressable 
            onPress={goToNextMonth} 
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.7 }, isCurrentMonth() && { opacity: 0.2 }]}
            disabled={isCurrentMonth()}
          >
            <MaterialIcons name="chevron-right" size={24} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ================= LEDGER TAB CONTENT ================= */}
        {activeTab === 'ledger' && (
          <View>
            {/* Top Stats Overview Card */}
            <ThemedView type="backgroundElement" style={[styles.unifiedCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.topRow}>
                <View style={styles.topLeft}>
                  <ThemedText type="default" style={{ opacity: 0.8, color: theme.textSecondary }}>My Expenses</ThemedText>
                  <ThemedText type="subtitle" style={[styles.heroValue, { color: theme.text }]}>
                    ₹{currentUser.expenses.toFixed(2)}
                  </ThemedText>
                </View>

                <View style={styles.topRight}>
                  <View style={[styles.progressContainer, { borderColor: '#2ed573', borderWidth: 8, borderRadius: 44 }]}>
                    <ThemedText style={{ fontSize: 32, fontWeight: '800', color: theme.text }}>
                      {currentUser.meals}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={{ opacity: 0.7, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
                    Meals
                  </ThemedText>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <View style={[styles.kpiBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.15)' : '#e8f7ed' }]}>
                  <View style={styles.kpiIconRow}>
                    <MaterialIcons name="trending-down" size={16} color="#2ed573" />
                    <ThemedText type="small" style={{ color: '#2ed573', marginLeft: 4 }}>Global Spent</ThemedText>
                  </View>
                  <ThemedText type="default" style={[styles.kpiValueText, { color: theme.text }]}>
                    ₹{totalExpenses.toFixed(2)}
                  </ThemedText>
                </View>

                <View style={[styles.kpiBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fcecec' }]}>
                  <View style={styles.kpiIconRow}>
                    <MaterialIcons name="track-changes" size={16} color="#ef4444" />
                    <ThemedText type="small" style={{ color: '#ef4444', marginLeft: 4 }}>Global Meals</ThemedText>
                  </View>
                  <ThemedText type="default" style={[styles.kpiValueText, { color: theme.text }]}>
                    {totalMeals}
                  </ThemedText>
                </View>
              </View>

              {isCurrentMonth() && (
                <Pressable 
                  style={({ pressed }) => [styles.logMealBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => setModalVisible(true)}
                >
                  <MaterialIcons name="add" size={20} color="#fff" />
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }}>Log Meal</ThemedText>
                </Pressable>
              )}
            </ThemedView>

            {/* Per Meal Cost Breakdown */}
            <View style={[styles.perMealRow, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.perMealHeader}>
                <View style={[styles.perMealIconBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff' }]}>
                  <MaterialIcons name="calculate" size={22} color="#6366f1" />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <ThemedText type="default" style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>Per Meal Cost</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    ₹{totalExpenses.toFixed(2)} ÷ {totalMeals} meals
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.perMealValueBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff' }]}>
                <ThemedText style={{ fontSize: 24, fontWeight: '800', color: '#6366f1' }}>
                  ₹{perMealCost.toFixed(2)}
                </ThemedText>
              </View>
            </View>

            {/* My Total Meal Cost */}
            <View style={[styles.perMealRow, { backgroundColor: theme.backgroundElement, marginTop: 12 }]}>
              <View style={styles.perMealHeader}>
                <View style={[styles.perMealIconBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8' }]}>
                  <MaterialIcons name="restaurant-menu" size={22} color="#ec4899" />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <ThemedText type="default" style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>My Meal Cost</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {currentUser.meals} meals × ₹{Math.round(perMealCost)}
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.perMealValueBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(236, 72, 153, 0.15)' : '#fdf2f8' }]}>
                <ThemedText style={{ fontSize: 24, fontWeight: '800', color: '#ec4899' }}>
                  ₹{Math.round(currentUser.meals * perMealCost)}
                </ThemedText>
              </View>
            </View>

            {/* Users List Section */}
            <View style={styles.usersSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Shared Room Calculations</ThemedText>
              
              {/* Current User Settlement Card */}
              {(() => {
                const myFairShare = perMealCost * currentUser.meals;
                const myRawPayment = myFairShare - currentUser.expenses;
                const myRoundedPayment = Math.round(myRawPayment);
                const myIsPaying = myRoundedPayment >= 0;
                const myAmount = Math.abs(myRoundedPayment);
                const accentColor = myIsPaying ? '#ef4444' : '#2ed573';

                return (
                  <View style={[styles.youSettleCard, { backgroundColor: theme.backgroundElement }]}>
                    <View style={styles.youSettleLeft}>
                      <View style={[styles.youSettleIconBadge, { backgroundColor: myIsPaying ? (colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.15)' : '#e8f7ed') }]}>
                        <MaterialIcons name="account-balance-wallet" size={22} color={accentColor} />
                      </View>
                      <View style={{ marginLeft: 14 }}>
                        <ThemedText type="default" style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>
                          You {myIsPaying ? 'Pay' : 'Receive'}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                          Ledger settlement balance
                        </ThemedText>
                      </View>
                    </View>
                    <View style={[styles.youSettleValueBadge, { backgroundColor: myIsPaying ? (colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2') : (colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.15)' : '#e8f7ed') }]}>
                      <ThemedText style={{ fontSize: 24, fontWeight: '800', color: accentColor }}>
                        ₹{myAmount}
                      </ThemedText>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.usersList}>
                {users.map((user, index) => {
                  const fairShare = perMealCost * user.meals;
                  const rawPayment = fairShare - user.expenses;
                  const roundedPayment = Math.round(rawPayment);
                  
                  const isPaying = roundedPayment >= 0;
                  const amountDisplay = Math.abs(roundedPayment);

                  return (
                    <View key={user.id}>
                      <View style={styles.userRow}>
                        <View style={styles.userInfo}>
                          <View style={styles.avatar}>
                            {user.avatar ? (
                              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                            ) : (
                              <View style={[styles.avatarFallback, { backgroundColor: getUserColor(user.name) }]}>
                                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                                  {user.name.charAt(0).toUpperCase()}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                          <View style={styles.userDetails}>
                            <ThemedText type="default" style={styles.username}>{user.name}</ThemedText>
                            <ThemedText type="small" style={styles.userSubtext}>
                              Spent ₹{user.expenses.toFixed(2)} • {user.meals} Meals
                            </ThemedText>
                          </View>
                        </View>

                        <View style={styles.userAction}>
                          <ThemedText type="smallBold" style={[styles.actionLabel, { color: isPaying ? '#ef4444' : '#2ed573' }]}>
                            {isPaying ? 'PAY' : 'RECEIVE'}
                          </ThemedText>
                          <ThemedText type="subtitle" style={[styles.actionAmount, { color: isPaying ? '#ef4444' : '#2ed573' }]}>
                            ₹{amountDisplay}
                          </ThemedText>
                        </View>
                      </View>
                      {index < users.length - 1 && <View style={[styles.listDivider, { backgroundColor: 'rgba(150,150,150,0.1)' }]} />}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ================= SETTLEMENTS TAB CONTENT ================= */}
        {activeTab === 'settlements' && (
          <View>
            {/* Warning Disclaimer Banner */}
            <View style={[styles.disclaimerBanner, { backgroundColor: colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.08)' }]}>
              <MaterialIcons name="info" size={16} color="#6366f1" />
              <ThemedText style={styles.disclaimerText}>
                These records are private settlements between you and the other user. They do not affect the shared room kitchen calculation formulas.
              </ThemedText>
            </View>

            {/* Overall Private Settlements Balance Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.netBalanceHeader}>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Net Private Balance
                </ThemedText>
                <ThemedText style={[
                  styles.netBalanceValue,
                  { color: duesStats.net >= 0 ? '#2ed573' : '#ef4444' }
                ]}>
                  {duesStats.net >= 0 ? '+' : ''}₹{duesStats.net.toFixed(2)}
                </ThemedText>
              </View>

              <View style={[styles.summaryDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

              <View style={styles.summaryRow}>
                <View style={[styles.summaryBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.08)' : 'rgba(46, 213, 115, 0.05)' }]}>
                  <View style={styles.summaryIconRow}>
                    <MaterialIcons name="arrow-downward" size={18} color="#2ed573" style={{ marginRight: 6 }} />
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      Receivable
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: '#2ed573', fontSize: 18, fontWeight: '800' }}>
                    ₹{duesStats.toReceive.toFixed(2)}
                  </ThemedText>
                </View>

                <View style={[styles.summaryBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)' }]}>
                  <View style={styles.summaryIconRow}>
                    <MaterialIcons name="arrow-upward" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      Payable
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: '#ef4444', fontSize: 18, fontWeight: '800' }}>
                    ₹{duesStats.toGive.toFixed(2)}
                  </ThemedText>
                </View>
              </View>

              {/* Add Settlement Button */}
              <Pressable 
                onPress={() => setIsFormOpen(true)}
                style={({ pressed }) => [
                  styles.logMealBtn,
                  { backgroundColor: '#6366f1', marginTop: 18 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 16 }}>Log Private Settlement</ThemedText>
              </Pressable>
            </View>

            {/* Dues List */}
            {isDuesLoading && dues.length === 0 ? (
              <View style={[styles.emptyState, { minHeight: 200 }]}>
                <ActivityIndicator size="large" color="#6366f1" />
                <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>Loading private settlements...</ThemedText>
              </View>
            ) : duesError && dues.length === 0 ? (
              <View style={[styles.emptyState, { minHeight: 200 }]}>
                <MaterialIcons name="error-outline" size={48} color="#ef4444" />
                <ThemedText style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>{duesError}</ThemedText>
                <Pressable 
                  onPress={fetchDues}
                  style={{ backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16 }}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</ThemedText>
                </Pressable>
              </View>
            ) : dues.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="account-balance-wallet" size={48} color={theme.textSecondary} />
                <ThemedText type="default" style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>
                  No private settlements logged for this month
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.duesCard, { backgroundColor: theme.backgroundElement }]}>
                {dues.map((item, idx) => {
                  const isLender = item.lender_name.toLowerCase().trim() === username?.toLowerCase().trim();
                  const amountColor = isLender ? '#2ed573' : '#ef4444';
                  const directionText = isLender 
                    ? `You will receive from ${item.username}` 
                    : `You need to give to ${item.lender_name}`;

                  const otherPersonName = isLender ? item.username : item.lender_name;
                  const avatarUri = getAvatar(otherPersonName);
                  const chipColor = getUserColor(otherPersonName);

                  return (
                    <View key={item.id}>
                      <View style={styles.dueRow}>
                        <View style={styles.dueAvatar}>
                          {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImgPrivate} />
                          ) : (
                            <View style={[styles.avatarFallbackPrivate, { backgroundColor: chipColor }]}>
                              <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                {otherPersonName.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                          )}
                        </View>

                        <View style={styles.dueDetails}>
                          <ThemedText style={{ fontWeight: '700', color: theme.text, fontSize: 15 }} numberOfLines={1}>
                            {item.subject}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                            {directionText}
                          </ThemedText>
                          <ThemedText style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4 }}>
                            {new Date(item.updated_at.replace(' ', 'T')).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </ThemedText>
                        </View>

                        <View style={styles.dueRight}>
                          <ThemedText style={{ fontWeight: '800', color: amountColor, fontSize: 16 }}>
                            {isLender ? '+' : '-'}₹{parseFloat(item.amount.toString()).toFixed(2)}
                          </ThemedText>
                          <Pressable 
                            onPress={() => handleDeleteDue(item.id)}
                            style={({ pressed }) => [
                              styles.deleteButton,
                              pressed && { backgroundColor: theme.backgroundSelected }
                            ]}
                          >
                            <MaterialIcons name="delete-outline" size={20} color={theme.textSecondary} />
                          </Pressable>
                        </View>
                      </View>
                      {idx < dues.length - 1 && (
                        <View style={[styles.itemDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* 5. Log Meal Modal (Ledger Tab) */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="restaurant" size={32} color="#2ed573" />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>Confirm Meal</ThemedText>
            <ThemedText type="default" style={styles.modalDesc}>
              Did you have a meal? This will log one meal to your monthly total and recalculate settlements.
            </ThemedText>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={styles.modalCancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={{ color: theme.text, fontWeight: '700' }}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable 
                style={styles.modalConfirmBtn} 
                onPress={handleLogMeal}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Yes, I ate</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Add Settlement Modal Form (Settlements Tab) */}
      <Modal
        visible={isFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalOverlayContainer}>
          <Pressable style={styles.absoluteOverlay} onPress={() => setIsFormOpen(false)} />
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingContainer}
          >
            <View style={[styles.modalContentPrivate, { backgroundColor: theme.backgroundElement }]}>
              {/* Header */}
              <View style={styles.modalHeaderPrivate}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#6366f1' }]}>
                  <MaterialIcons name="account-balance" size={24} color="#fff" />
                </View>
                <ThemedText type="subtitle" style={{ fontWeight: '800', textAlign: 'center' }}>Add Private Settelement</ThemedText>
                <ThemedText style={[styles.modalSubtitlePrivate, { color: theme.textSecondary }]}>Log a settlement between you & another user</ThemedText>
              </View>

              {/* Form Body */}
              <View>
                
                {/* Subject Field */}
                <ThemedText style={styles.modalLabelPrivate}>Subject / Reason</ThemedText>
                <View style={[
                  styles.modalInputWrapperPrivate,
                  { borderColor: isSubjectFocused ? '#6366f1' : theme.backgroundSelected, backgroundColor: theme.background }
                ]}>
                  <MaterialIcons name="edit" size={18} color={isSubjectFocused ? '#6366f1' : theme.textSecondary} />
                  <TextInput
                    style={[styles.modalInputPrivate, { color: theme.text }]}
                    placeholder="e.g. WiFi Bill, Groceries, Dinner..."
                    placeholderTextColor={theme.textSecondary}
                    value={subject}
                    onChangeText={setSubject}
                    onFocus={() => setIsSubjectFocused(true)}
                    onBlur={() => setIsSubjectFocused(false)}
                  />
                </View>

                {/* Amount Field */}
                <ThemedText style={styles.modalLabelPrivate}>Amount (₹ INR)</ThemedText>
                <View style={[
                  styles.modalInputWrapperPrivate,
                  { borderColor: isAmountFocused ? '#6366f1' : theme.backgroundSelected, backgroundColor: theme.background }
                ]}>
                  <ThemedText style={{ color: isAmountFocused ? '#6366f1' : theme.textSecondary, fontSize: 16, fontWeight: '700' }}>₹</ThemedText>
                  <TextInput
                    style={[styles.modalInputPrivate, { color: theme.text }]}
                    placeholder="e.g. 500"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(text) => {
                      let cleanText = text.replace(/[^0-9.]/g, '');
                      const parts = cleanText.split('.');
                      if (parts.length > 2) {
                        cleanText = parts[0] + '.' + parts[1];
                      }
                      setAmount(cleanText);
                    }}
                    onFocus={() => setIsAmountFocused(true)}
                    onBlur={() => setIsAmountFocused(false)}
                  />
                </View>

                {/* Settlement Type Segment Switch */}
                <ThemedText style={styles.modalLabelPrivate}>Settlement Type</ThemedText>
                <View style={[styles.typeSwitcherPrivate, { backgroundColor: theme.background }]}>
                  <Pressable 
                    onPress={() => setSettlementType('receive')}
                    style={[
                      styles.typeButtonPrivate,
                      settlementType === 'receive' && { backgroundColor: colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(46, 213, 115, 0.1)' }
                    ]}
                  >
                    <MaterialIcons name="call-received" size={16} color={settlementType === 'receive' ? '#2ed573' : theme.textSecondary} />
                    <ThemedText style={[styles.typeButtonTextPrivate, { color: settlementType === 'receive' ? '#2ed573' : theme.textSecondary }]}>
                      Will Receive
                    </ThemedText>
                  </Pressable>
                  <Pressable 
                    onPress={() => setSettlementType('give')}
                    style={[
                      styles.typeButtonPrivate,
                      settlementType === 'give' && { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)' }
                    ]}
                  >
                    <MaterialIcons name="call-made" size={16} color={settlementType === 'give' ? '#ef4444' : theme.textSecondary} />
                    <ThemedText style={[styles.typeButtonTextPrivate, { color: settlementType === 'give' ? '#ef4444' : theme.textSecondary }]}>
                      Need to Give
                    </ThemedText>
                  </Pressable>
                </View>

                {/* User Selector Dropdown */}
                <ThemedText style={styles.modalLabelPrivate}>Select Roommate / Person</ThemedText>
                <Pressable
                  onPress={() => setIsRoommateDropdownOpen(!isRoommateDropdownOpen)}
                  style={[styles.dropdownButtonPrivate, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, borderWidth: 1.5 }]}
                >
                  <ThemedText style={{ flex: 1, fontWeight: '600', color: theme.text, fontSize: 14 }}>
                    {selectedRoommate === 'Other' ? 'Other / Custom Name' : selectedRoommate || 'Select user...'}
                  </ThemedText>
                  <MaterialIcons name={isRoommateDropdownOpen ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={theme.textSecondary} />
                </Pressable>

                {isRoommateDropdownOpen && (
                  <View style={[styles.dropdownMenuInlinePrivate, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
                    {selectableRoommates.map(user => (
                      <Pressable
                        key={user.id}
                        onPress={() => {
                          setSelectedRoommate(user.username);
                          setIsRoommateDropdownOpen(false);
                        }}
                        style={styles.dropdownItemInlinePrivate}
                      >
                        <ThemedText style={{ color: theme.text }}>{user.username}</ThemedText>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => {
                        setSelectedRoommate('Other');
                        setIsRoommateDropdownOpen(false);
                      }}
                      style={styles.dropdownItemInlinePrivate}
                    >
                      <ThemedText style={{ color: '#6366f1', fontWeight: 'bold' }}>Other (Custom Name)</ThemedText>
                    </Pressable>
                  </View>
                )}

                {/* Custom Name Input (Visible if 'Other' selected) */}
                {selectedRoommate === 'Other' && (
                  <View style={{ marginTop: 8 }}>
                    <ThemedText style={styles.modalLabelPrivate}>Enter Name</ThemedText>
                    <View style={[
                      styles.modalInputWrapperPrivate,
                      { borderColor: isCustomNameFocused ? '#6366f1' : theme.backgroundSelected, backgroundColor: theme.background }
                    ]}>
                      <MaterialIcons name="person-outline" size={18} color={isCustomNameFocused ? '#6366f1' : theme.textSecondary} />
                      <TextInput
                        style={[styles.modalInputPrivate, { color: theme.text }]}
                        placeholder="Enter full name..."
                        placeholderTextColor={theme.textSecondary}
                        value={customName}
                        onChangeText={setCustomName}
                        onFocus={() => setIsCustomNameFocused(true)}
                        onBlur={() => setIsCustomNameFocused(false)}
                      />
                    </View>
                  </View>
                )}

              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonsPrivate}>
                <Pressable
                  onPress={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.modalBtnPrivate,
                    styles.modalCancelBtnPrivate,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <ThemedText style={{ fontWeight: '700' }}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleAddSettlement}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.modalBtnPrivate,
                    styles.modalSubmitBtnPrivate,
                    { backgroundColor: '#2ed573' },
                    (pressed || isSubmitting) && { opacity: 0.7 }
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#1a1a1a" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={18} color="#1a1a1a" style={{ marginRight: 4 }} />
                      <ThemedText style={{ color: '#1a1a1a', fontWeight: '700' }}>Save</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  navIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  segmentTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentTabText: {
    fontSize: 13,
  },
  monthFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  monthText: {
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120, // Space for tab bar
  },
  unifiedCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  topLeft: {
    flex: 1,
  },
  heroValue: {
    fontSize: 38,
    fontWeight: '800',
    marginTop: 8,
  },
  topRight: {
    alignItems: 'center',
  },
  progressContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValueText: {
    fontSize: 20,
    fontWeight: '700',
  },
  perMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  perMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  perMealIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perMealValueBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  youSettleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  youSettleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  youSettleIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youSettleValueBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  usersSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  usersList: {
    gap: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2ed573',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  userSubtext: {
    opacity: 0.6,
  },
  userAction: {
    alignItems: 'flex-end',
  },
  actionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 4,
  },
  actionAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  listDivider: {
    height: 1,
    width: '100%',
  },
  logMealBtn: {
    backgroundColor: '#2ed573',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalOverlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDesc: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#2ed573',
  },

  // Settlements section specific styling
  disclaimerBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    color: '#6366f1',
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  netBalanceHeader: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  netBalanceValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  duesCard: {
    borderRadius: 24,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dueAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImgPrivate: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  avatarFallbackPrivate: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDetails: {
    flex: 1,
  },
  dueRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  // Private dues modal specific styles
  keyboardAvoidingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContentPrivate: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeaderPrivate: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
  },
  modalSubtitlePrivate: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalLabelPrivate: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInputWrapperPrivate: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  modalInputPrivate: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  typeSwitcherPrivate: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  typeButtonPrivate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  typeButtonTextPrivate: {
    fontWeight: '700',
    fontSize: 13,
  },
  dropdownButtonPrivate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dropdownMenuInlinePrivate: {
    borderWidth: 1.5,
    borderRadius: 14,
    marginTop: 4,
    padding: 4,
    overflow: 'hidden',
  },
  dropdownItemInlinePrivate: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalButtonsPrivate: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtnPrivate: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnPrivate: {},
  modalSubmitBtnPrivate: {
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme, Modal, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToPurchaseUpdates } from '@/hooks/use-shared-data';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { homeService, mealService } from '@/services/api';

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

export default function HomeScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { username, token } = useAuth();
  
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalVisible, setModalVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

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

  useEffect(() => {
    if (isFocused && token) {
      fetchDashboardData();
    }
  }, [currentDate, token, isFocused]);

  useEffect(() => {
    if (!token) return;
    const unsubscribe = subscribeToPurchaseUpdates(() => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [token]);

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

  // Dynamic calculations based on backend database state
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
        // Exclude if meal = 0, expense = 0, and settlement (rounded payment) = 0
        const fairShare = perMealCost * u.meals;
        const rawPayment = fairShare - u.expenses;
        const roundedPayment = Math.floor(rawPayment);
        
        return u.meals !== 0 || u.expenses !== 0 || roundedPayment !== 0;
      });
  }, [dashboardData, perMealCost]);

  // Current User Stats
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
      {/* 1. Header & Month Navigation */}
      <View style={styles.header}>
        <ThemedText type="title">Home</ThemedText>
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
        
        {/* 2. Top Section: Matched Design */}
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

        {/* 4. Users List Section */}
        <View style={styles.usersSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Settlements</ThemedText>
          
          {/* Current User Settlement Card */}
          {(() => {
            const myFairShare = perMealCost * currentUser.meals;
            const myRawPayment = myFairShare - currentUser.expenses;
            const myRoundedPayment = Math.floor(myRawPayment);
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
                      This month's settlement
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
              // Calculation: per meal cost * total meals by the user floor that value - total expenses of that user
              const fairShare = perMealCost * user.meals;
              const rawPayment = fairShare - user.expenses;
              const roundedPayment = Math.floor(rawPayment);
              
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

      </ScrollView>

      {/* 5. Log Meal Modal */}
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
  progressTextContainer: {
    position: 'absolute',
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
});

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme, Modal, ActivityIndicator, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import Constants from 'expo-constants';

// --- TYPES ---
type Meal = {
  id: number;
  username: string;
  date: Date;
};

// Color map for user avatars
const USER_COLORS: Record<string, string> = {
  'sujay': '#6366f1',
  'pritam kumar': '#f59e0b',
  'arghya': '#2ed573',
  'manas': '#ec4899',
  'biproteep': '#8b5cf6',
  'saikat': '#14b8a6',
};

const getUserColor = (name: string) => USER_COLORS[name.toLowerCase().trim()] || '#64748b';

const formatTimeSql = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${h}:${min}:${s}`;
};

const getBaseUrl = () => {
  let host = '10.229.201.77';
  if (Platform.OS === 'web') {
    host = 'localhost';
  } else {
    const hostUri = Constants.expoConfig?.hostUri || '';
    const uriHost = hostUri.split(':')[0];
    if (uriHost && !uriHost.includes('exp.direct') && !uriHost.includes('ngrok')) {
      host = uriHost;
    }
  }
  return `http://${host}:8000`;
};

export default function MealsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { username, token } = useAuth();

  // --- Month Navigation ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>(username || 'All');
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  const fetchMeals = async () => {
    if (!token) return;
    setIsLoading(true);
    setFetchError('');
    try {
      const month = currentDate.getMonth() + 1; // 1-indexed
      const year = currentDate.getFullYear();
      const baseUrl = getBaseUrl();
      
      const response = await fetch(`${baseUrl}/backend/api/meals.php?month=${month}&year=${year}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        const fetchedMeals: Meal[] = (data.meals || []).map((m: any) => ({
          id: m.id,
          username: m.username,
          date: new Date(m.meal_time.replace(' ', 'T')),
        }));
        setMeals(fetchedMeals);
      } else {
        setFetchError(data.message || 'Failed to fetch meals.');
      }
    } catch (err) {
      console.error('Fetch meals error:', err);
      setFetchError('Cannot connect to calculation server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && token) {
      fetchMeals();
    }
  }, [currentDate, token, isFocused]);

  // Get unique usernames
  const uniqueUsers = useMemo(() => {
    const names = new Set(meals.map(m => m.username.trim()));
    return ['All', ...Array.from(names)];
  }, [meals]);

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

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // --- Filtered & grouped data ---
  const filteredMeals = useMemo(() => {
    return meals
      .filter(m => selectedUser === 'All' || m.username.toLowerCase().trim() === selectedUser.toLowerCase().trim());
  }, [selectedUser, meals]);

  const totalMeals = filteredMeals.length;

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Meal[]> = {};
    filteredMeals.forEach(m => {
      const key = m.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups);
  }, [filteredMeals]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Meals</ThemedText>
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

      {/* User Filter Dropdown */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setDropdownOpen(true)}
          style={[styles.dropdownButton, { backgroundColor: theme.backgroundElement }]}
        >
          {selectedUser !== 'All' && (
            <View style={[styles.chipDot, { backgroundColor: getUserColor(selectedUser) }]} />
          )}
          <ThemedText style={{ flex: 1, fontWeight: '600', color: theme.text, fontSize: 15 }}>
            {selectedUser === 'All' ? 'All Users' : selectedUser.charAt(0).toUpperCase() + selectedUser.slice(1)}
          </ThemedText>
          <MaterialIcons name="arrow-drop-down" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Dropdown Modal */}
      <Modal visible={isDropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <Pressable style={styles.dropdownOverlay} onPress={() => setDropdownOpen(false)}>
          <View style={[styles.dropdownMenu, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="default" style={{ fontWeight: '700', fontSize: 16, marginBottom: 12, color: theme.text }}>Filter by User</ThemedText>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {uniqueUsers.map(user => {
                const isActive = selectedUser.toLowerCase().trim() === user.toLowerCase().trim();
                const chipColor = user === 'All' ? '#6366f1' : getUserColor(user);
                return (
                  <Pressable
                    key={user}
                    onPress={() => { setSelectedUser(user); setDropdownOpen(false); }}
                    style={[styles.dropdownItem, isActive && { backgroundColor: chipColor + '18' }]}
                  >
                    <View style={styles.dropdownItemLeft}>
                      {user !== 'All' ? (
                        <View style={[styles.dropdownAvatar, { backgroundColor: chipColor }]}>
                          <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                            {user.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={[styles.dropdownAvatar, { backgroundColor: chipColor }]}>
                          <MaterialIcons name="people" size={16} color="#fff" />
                        </View>
                      )}
                      <ThemedText style={{ fontSize: 15, fontWeight: isActive ? '700' : '500', color: theme.text }}>
                         {user === 'All' ? 'All Users' : user.charAt(0).toUpperCase() + user.slice(1)}
                      </ThemedText>
                    </View>
                    {isActive && <MaterialIcons name="check" size={20} color={chipColor} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Grouped Meal List */}
        {isLoading && meals.length === 0 ? (
          <View style={[styles.emptyState, { minHeight: 200 }]}>
            <ActivityIndicator size="large" color="#2ed573" />
            <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>Loading logged meals...</ThemedText>
          </View>
        ) : fetchError && meals.length === 0 ? (
          <View style={[styles.emptyState, { minHeight: 200 }]}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <ThemedText style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>{fetchError}</ThemedText>
            <Pressable 
              onPress={fetchMeals}
              style={{ backgroundColor: '#2ed573', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16 }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : groupedByDate.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="restaurant-menu" size={48} color={theme.textSecondary} />
            <ThemedText type="default" style={{ color: theme.textSecondary, marginTop: 12 }}>
              No meals logged this month
            </ThemedText>
          </View>
        ) : (
          groupedByDate.map(([dateLabel, meals]) => {
            return (
              <View key={dateLabel} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                  <ThemedText type="default" style={{ fontWeight: '700', color: theme.text }}>
                    {dateLabel}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                  </ThemedText>
                </View>

                {/* Items for that date */}
                <View style={[styles.dateCard, { backgroundColor: theme.backgroundElement }]}>
                  {meals.map((item, idx) => (
                    <View key={item.id}>
                      <View style={styles.mealRow}>
                        <View style={[styles.mealAvatar, { backgroundColor: getUserColor(item.username) }]}>
                          <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                            {item.username.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.mealInfo}>
                          <ThemedText type="default" style={{ fontWeight: '600', color: theme.text, fontSize: 15 }}>
                            {item.username}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ fontWeight: '600', color: theme.textSecondary, fontSize: 14 }}>
                          {formatTimeSql(item.date)}
                        </ThemedText>
                      </View>
                      {idx < meals.length - 1 && (
                        <View style={[styles.itemDivider, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
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
  filterRow: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dropdownMenu: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateCard: {
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  mealAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mealInfo: {
    flex: 1,
  },
  itemDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});


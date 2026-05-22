import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme, Modal, ActivityIndicator, Platform, Image } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToPurchaseUpdates } from '@/hooks/use-shared-data';
import Constants from 'expo-constants';
import { purchaseService } from '@/services/api';

// --- TYPES ---
type Purchase = {
  id: number;
  username: string;
  product: string;
  price: number;
  date: Date;
  avatar?: string | null;
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

export default function PurchasesScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { username, token } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // --- Month Navigation ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>(username || 'All');
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFocused && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  const fetchPurchases = async () => {
    if (!token) return;
    setIsLoading(true);
    setFetchError('');
    try {
      const month = currentDate.getMonth() + 1; // 1-indexed
      const year = currentDate.getFullYear();

      const data = await purchaseService.getPurchases({ month, year });
      if (data.success) {
        const fetchedPurchases: Purchase[] = (data.purchases || []).map((p: any) => ({
          id: p.id,
          username: p.username,
          product: p.product,
          price: p.price,
          date: new Date(p.purchase_date.replace(' ', 'T')),
          avatar: p.avatar,
        }));
        setPurchases(fetchedPurchases);
      } else {
        setFetchError(data.message || 'Failed to fetch purchases.');
      }
    } catch (err: any) {
      console.error('Fetch purchases error:', err);
      setFetchError(err.message || 'Cannot connect to calculation server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && token) {
      fetchPurchases();
    }
  }, [currentDate, token, isFocused]);

  useEffect(() => {
    if (!token) return;
    const unsubscribe = subscribeToPurchaseUpdates(() => {
      fetchPurchases();
    });
    return unsubscribe;
  }, [token]);

  // Create mapping of username -> avatar
  const userAvatars = useMemo(() => {
    const map: Record<string, string | null> = {};
    purchases.forEach(p => {
      const key = p.username.toLowerCase().trim();
      if (p.avatar && !map[key]) {
        map[key] = p.avatar;
      }
    });
    return map;
  }, [purchases]);

  // Get unique usernames
  const uniqueUsers = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    purchases.forEach(p => {
      const trimmed = p.username.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !seen.has(lower)) {
        seen.add(lower);
        names.push(trimmed);
      }
    });
    return ['All', ...names];
  }, [purchases]);

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
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => selectedUser === 'All' || p.username.toLowerCase().trim() === selectedUser.toLowerCase().trim())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedUser, purchases]);

  const totalSpent = filteredPurchases.reduce((sum, p) => sum + p.price, 0);
  const totalItems = filteredPurchases.length;

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Purchase[]> = {};
    filteredPurchases.forEach(p => {
      const key = p.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups);
  }, [filteredPurchases]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Purchases</ThemedText>
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
                const avatarUri = user === 'All' ? null : userAvatars[user.toLowerCase().trim()];
                return (
                  <Pressable
                    key={user}
                    onPress={() => { setSelectedUser(user); setDropdownOpen(false); }}
                    style={[styles.dropdownItem, isActive && { backgroundColor: chipColor + '18' }]}
                  >
                    <View style={styles.dropdownItemLeft}>
                       {user !== 'All' ? (
                        <View style={styles.dropdownAvatar}>
                          {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImgSmall} />
                          ) : (
                            <View style={[styles.avatarFallbackSmall, { backgroundColor: chipColor }]}>
                              <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                                {user.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={[styles.dropdownAvatar, { backgroundColor: chipColor, alignItems: 'center', justifyContent: 'center' }]}>
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

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(46, 213, 115, 0.15)' : '#e8f7ed' }]}>
              <View style={styles.summaryIconRow}>
                <MaterialIcons name="shopping-cart" size={16} color="#2ed573" />
                <ThemedText type="small" style={{ color: '#2ed573', marginLeft: 6 }}>Total Spent</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
                ₹{totalSpent.toFixed(2)}
              </ThemedText>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#eef2ff' }]}>
              <View style={styles.summaryIconRow}>
                <MaterialIcons name="receipt-long" size={16} color="#6366f1" />
                <ThemedText type="small" style={{ color: '#6366f1', marginLeft: 6 }}>Total Items</ThemedText>
              </View>
              <ThemedText style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>
                {totalItems}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Grouped Purchase List */}
        {isLoading && purchases.length === 0 ? (
          <View style={[styles.emptyState, { minHeight: 200 }]}>
            <ActivityIndicator size="large" color="#2ed573" />
            <ThemedText style={{ color: theme.textSecondary, marginTop: 12 }}>Loading purchases...</ThemedText>
          </View>
        ) : fetchError && purchases.length === 0 ? (
          <View style={[styles.emptyState, { minHeight: 200 }]}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <ThemedText style={{ color: theme.textSecondary, marginTop: 12, textAlign: 'center' }}>{fetchError}</ThemedText>
            <Pressable 
              onPress={fetchPurchases}
              style={{ backgroundColor: '#2ed573', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16 }}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</ThemedText>
            </Pressable>
          </View>
        ) : groupedByDate.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-basket" size={48} color={theme.textSecondary} />
            <ThemedText type="default" style={{ color: theme.textSecondary, marginTop: 12 }}>
              No purchases this month
            </ThemedText>
          </View>
        ) : (
          groupedByDate.map(([dateLabel, purchases]) => {
            const dayTotal = purchases.reduce((s, p) => s + p.price, 0);
            return (
              <View key={dateLabel} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={styles.dateHeader}>
                  <ThemedText type="default" style={{ fontWeight: '700', color: theme.text }}>
                    {dateLabel}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    ₹{dayTotal.toFixed(2)}
                  </ThemedText>
                </View>

                {/* Items for that date */}
                <View style={[styles.dateCard, { backgroundColor: theme.backgroundElement }]}>
                  {purchases.map((item, idx) => (
                    <View key={item.id}>
                      <View style={styles.purchaseRow}>
                        <View style={styles.purchaseAvatar}>
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                          ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: getUserColor(item.username) }]}>
                              <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                                {item.username.charAt(0).toUpperCase()}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <View style={styles.purchaseInfo}>
                          <ThemedText type="default" style={{ fontWeight: '600', color: theme.text, fontSize: 15 }}>
                            {item.product}
                          </ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                            {item.username} • {formatTime(item.date)}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ fontWeight: '700', color: theme.text, fontSize: 16 }}>
                          ₹{item.price.toFixed(2)}
                        </ThemedText>
                      </View>
                      {idx < purchases.length - 1 && (
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
    overflow: 'hidden',
  },
  avatarImgSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  avatarFallbackSmall: {
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
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  purchaseAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseInfo: {
    flex: 1,
  },
  itemDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});

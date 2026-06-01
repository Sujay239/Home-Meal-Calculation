import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, useColorScheme, Modal, ActivityIndicator, Platform, Image, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToPurchaseUpdates, useRoommates } from '@/hooks/use-shared-data';
import Constants from 'expo-constants';
import { purchaseService, waterLogService } from '@/services/api';

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
  const { roommates, getAvatar } = useRoommates();
  const isFocused = useIsFocused();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // --- Month Navigation ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>(username || 'All');
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  // --- Water Log States ---
  const [activeTab, setActiveTab] = useState<'purchases' | 'water'>('purchases');
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [isWaterLoading, setIsWaterLoading] = useState(false);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState<number | null>(null);
  const [lastWaterLog, setLastWaterLog] = useState<any>(null);
  const [isConfirmWaterModalOpen, setConfirmWaterModalOpen] = useState(false);
  const [isWaterConfirmed, setIsWaterConfirmed] = useState(false);

  const fetchWaterLogs = async () => {
    if (!token) return;
    setIsWaterLoading(true);
    try {
      const month = currentDate.getMonth() + 1; // 1-indexed
      const year = currentDate.getFullYear();
      const data = await waterLogService.getLogs({ month, year });
      if (data.success) {
        setWaterLogs(data.logs || []);
        if (data.last_log) {
          const latest = data.last_log;
          setLastWaterLog(latest);
          
          // Compute remaining seconds on client-side
          const logTime = new Date(latest.log_time.replace(' ', 'T')).getTime();
          const now = Date.now();
          const fortyEightHoursMs = 48 * 3600 * 1000;
          const diffMs = now - logTime;
          
          if (diffMs < fortyEightHoursMs) {
            setLockRemainingSeconds(Math.ceil((fortyEightHoursMs - diffMs) / 1000));
          } else {
            setLockRemainingSeconds(null);
          }
        } else {
          setLastWaterLog(null);
          setLockRemainingSeconds(null);
        }
      }
    } catch (err) {
      console.error('Fetch water logs error:', err);
    } finally {
      setIsWaterLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused && token) {
      fetchWaterLogs();
    }
  }, [currentDate, token, isFocused]);

  useEffect(() => {
    if (lockRemainingSeconds === null || lockRemainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockRemainingSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockRemainingSeconds]);

  const formatRemainingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${secs}s`;
    return result;
  };

  const handleLogWater = () => {
    setIsWaterConfirmed(false);
    setConfirmWaterModalOpen(true);
  };

  const confirmLogWater = async () => {
    setConfirmWaterModalOpen(false);
    setIsWaterLoading(true);
    try {
      const data = await waterLogService.logWater();
      if (data.success) {
        Alert.alert('Success', 'Water purchase logged successfully!');
        fetchWaterLogs();
      } else {
        Alert.alert('Error', data.message || 'Failed to log water purchase.');
      }
    } catch (err: any) {
      console.error('Log water error:', err);
      Alert.alert('Error', err.message || 'Cannot log water purchase.');
    } finally {
      setIsWaterLoading(false);
    }
  };

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

  // Get unique usernames from cached roommates list
  const uniqueUsers = useMemo(() => {
    return ['All', ...roommates.map(r => r.username)];
  }, [roommates]);

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
        <ThemedText type="title">{activeTab === 'purchases' ? 'Purchases' : 'Water Log'}</ThemedText>
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

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.backgroundElement }]}>
        <Pressable
          onPress={() => setActiveTab('purchases')}
          style={[
            styles.tabButton,
            activeTab === 'purchases' && { backgroundColor: theme.backgroundSelected }
          ]}
        >
          <MaterialIcons
            name="shopping-bag"
            size={18}
            color={activeTab === 'purchases' ? theme.text : theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <ThemedText
            style={[
              styles.tabButtonText,
              { color: activeTab === 'purchases' ? theme.text : theme.textSecondary, fontWeight: activeTab === 'purchases' ? '700' : '500' }
            ]}
          >
            Room Purchases
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('water')}
          style={[
            styles.tabButton,
            activeTab === 'water' && { backgroundColor: theme.backgroundSelected }
          ]}
        >
          <MaterialIcons
            name="local-drink"
            size={18}
            color={activeTab === 'water' ? '#38bdf8' : theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <ThemedText
            style={[
              styles.tabButtonText,
              { color: activeTab === 'water' ? '#38bdf8' : theme.textSecondary, fontWeight: activeTab === 'water' ? '700' : '500' }
            ]}
          >
            Water Purchase
          </ThemedText>
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
                const avatarUri = user === 'All' ? null : getAvatar(user);
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

      {/* Water Purchase Confirmation Modal */}
      <Modal
        visible={isConfirmWaterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmWaterModalOpen(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setConfirmWaterModalOpen(false)}>
          <View style={[styles.confirmModalContainer, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.confirmIconContainer}>
              <MaterialIcons name="local-drink" size={32} color="#38bdf8" />
            </View>
            
            <ThemedText style={[styles.confirmTitle, { color: theme.text }]}>Confirm Water Purchase?</ThemedText>
            
            <View style={[styles.warningBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2' }]}>
              <MaterialIcons name="warning" size={18} color="#ef4444" style={{ marginRight: 8, marginTop: 1 }} />
              <ThemedText style={styles.warningText}>
                Once logged, no one in the room can log another water purchase for the next <ThemedText style={{ fontWeight: '700', color: '#ef4444' }}>2 days (48 hours)</ThemedText>.
              </ThemedText>
            </View>
            
            <ThemedText style={[styles.confirmDescription, { color: theme.textSecondary }]}>
              This will record your name (<ThemedText style={{ fontWeight: '700', color: theme.text }}>{username}</ThemedText>) and the current date/time in the shared ledger.
            </ThemedText>

            {/* Checkbox Confirmation Message */}
            <Pressable
              onPress={() => setIsWaterConfirmed(!isWaterConfirmed)}
              style={styles.checkboxContainer}
            >
              <View style={[styles.checkbox, isWaterConfirmed && styles.checkboxChecked]}>
                {isWaterConfirmed && <MaterialIcons name="check" size={14} color="#fff" />}
              </View>
              <ThemedText style={[styles.checkboxLabel, { color: theme.text }]}>
                I confirm that I have purchased the water jar and want to log it now.
              </ThemedText>
            </Pressable>
            
            <View style={styles.modalActionButtons}>
              <Pressable
                onPress={() => setConfirmWaterModalOpen(false)}
                style={[styles.modalButton, styles.modalCancelButton, { borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
              >
                <ThemedText style={[styles.modalButtonText, { color: theme.text }]}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable
                disabled={!isWaterConfirmed}
                onPress={confirmLogWater}
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  !isWaterConfirmed && styles.modalConfirmButtonDisabled
                ]}
              >
                <ThemedText style={[styles.modalButtonText, { color: isWaterConfirmed ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
                  Log Purchase
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {activeTab === 'purchases' ? (
        <>
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
                              {getAvatar(item.username) ? (
                                <Image source={{ uri: getAvatar(item.username)! }} style={styles.avatarImg} />
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
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Water Status Card */}
          <View style={[styles.waterCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.waterHeaderRow}>
              <View style={styles.waterHeaderLeft}>
                <View style={[styles.waterIconCircle, { backgroundColor: '#38bdf8' }]}>
                  <MaterialIcons name="local-drink" size={20} color="#fff" />
                </View>
                <View>
                  <ThemedText style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Water Status</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>Track jar purchases</ThemedText>
                </View>
              </View>
              
              {lockRemainingSeconds !== null && lockRemainingSeconds > 0 ? (
                <View style={[styles.lockBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                  <MaterialIcons name="lock" size={14} color="#ef4444" style={{ marginRight: 4 }} />
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Locked</ThemedText>
                </View>
              ) : (
                <View style={[styles.lockBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7' }]}>
                  <MaterialIcons name="lock-open" size={14} color="#22c55e" style={{ marginRight: 4 }} />
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#22c55e' }}>Available</ThemedText>
                </View>
              )}
            </View>

            {/* Log Button */}
            <Pressable
              disabled={lockRemainingSeconds !== null && lockRemainingSeconds > 0 || isWaterLoading}
              onPress={handleLogWater}
              style={({ pressed }) => [
                styles.waterLogButton,
                lockRemainingSeconds !== null && lockRemainingSeconds > 0
                  ? styles.waterLogButtonDisabled
                  : { backgroundColor: '#38bdf8' },
                pressed && { opacity: 0.8 }
              ]}
            >
              {isWaterLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {lockRemainingSeconds !== null && lockRemainingSeconds > 0 
                      ? `Locked (${formatRemainingTime(lockRemainingSeconds)})`
                      : 'Log Water Purchase'}
                  </ThemedText>
                </>
              )}
            </Pressable>

            {/* Lock details */}
            {lockRemainingSeconds !== null && lockRemainingSeconds > 0 && lastWaterLog && (
              <ThemedText style={styles.waterLockInfo}>
                Already logged by <ThemedText style={{ fontWeight: '700' }}>{lastWaterLog.username}</ThemedText> on {new Date(lastWaterLog.log_time.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
              </ThemedText>
            )}
          </View>

          {/* Dedicated Log List */}
          <View style={[styles.waterCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={[styles.waterLogsTitle, { color: theme.text, fontSize: 15, marginBottom: 16 }]}>Water Purchases Log</ThemedText>
            {isWaterLoading && waterLogs.length === 0 ? (
              <ActivityIndicator size="small" color="#38bdf8" style={{ marginVertical: 20 }} />
            ) : waterLogs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialIcons name="opacity" size={48} color={theme.textSecondary} style={{ opacity: 0.3, marginBottom: 12 }} />
                <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>No water purchases logged yet.</ThemedText>
              </View>
            ) : (
              waterLogs.map((log) => {
                const logDate = new Date(log.log_time.replace(' ', 'T'));
                const avatarUri = getAvatar(log.username);
                const userChipColor = getUserColor(log.username);
                
                return (
                  <View key={log.id} style={styles.waterLogFullItem}>
                    <View style={styles.waterLogItemLeft}>
                      <View style={styles.purchaseAvatar}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                        ) : (
                          <View style={[styles.avatarFallback, { backgroundColor: userChipColor }]}>
                            <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                              {log.username.charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <ThemedText style={{ fontSize: 15, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                          {log.username.charAt(0).toUpperCase() + log.username.slice(1)}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                          Logged water jar purchase
                        </ThemedText>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0, minWidth: 80 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '600', color: theme.text }} numberOfLines={1}>
                        {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </ThemedText>
                      <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                        {logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </ThemedText>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
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
  waterCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  waterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waterIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  waterLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  waterLogButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  waterLockInfo: {
    fontSize: 12,
    textAlign: 'center',
    color: '#ef4444',
    marginTop: 10,
    fontWeight: '500',
  },
  waterLogsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 14,
  },
  waterLogsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  waterLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  waterLogItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  waterLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confirmModalContainer: {
    width: '100%',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
  },
  warningText: {
    fontSize: 13,
    color: '#ef4444',
    flex: 1,
    lineHeight: 18,
  },
  confirmDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalConfirmButton: {
    backgroundColor: '#38bdf8',
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    width: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#38bdf8',
  },
  checkboxLabel: {
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 16,
    padding: 4,
    height: 48,
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 12,
  },
  tabButtonText: {
    fontSize: 14,
  },
  waterLogFullItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.08)',
  },
});

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const INITIAL_CART = [
  {
    id: '1',
    name: 'Grilled Salmon Meal Kit',
    desc: 'With asparagus, wild brown rice, and lemon butter sauce',
    calories: '650 kcal',
    price: 18.50,
    qty: 1,
    protein: '45g',
  },
  {
    id: '2',
    name: 'Keto Almond Butter Crunch Cups',
    desc: 'Organic raw almond butter, dark cocoa coating',
    calories: '180 kcal',
    price: 6.90,
    qty: 2,
    protein: '5g',
  },
  {
    id: '3',
    name: 'Avocado Spinach Greens Bowl',
    desc: 'Fresh mixed microgreens, vinaigrette oil dressing',
    calories: '280 kcal',
    price: 11.20,
    qty: 1,
    protein: '6g',
  },
];

export default function CartScreen() {
  const theme = useTheme();
  const [cartItems, setCartItems] = useState(INITIAL_CART);

  const updateQty = (id: string, delta: number) => {
    setCartItems(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return { ...item, qty: Math.max(0, nextQty) };
          }
          return item;
        })
        .filter(item => item.qty > 0)
    );
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  };

  const getSubtotalCalories = () => {
    return cartItems.reduce((acc, item) => {
      const kcalVal = parseInt(item.calories.replace(' kcal', ''), 10);
      return acc + kcalVal * item.qty;
    }, 0);
  };

  const getSubtotalProtein = () => {
    return cartItems.reduce((acc, item) => {
      const proteinVal = parseInt(item.protein.replace('g', ''), 10);
      return acc + proteinVal * item.qty;
    }, 0);
  };

  const deliveryFee = cartItems.length > 0 ? 3.99 : 0;
  const taxRate = 0.08;
  const subtotal = getSubtotal();
  const tax = subtotal * taxRate;
  const total = subtotal + deliveryFee + tax;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty! Add some healthy meals to checkout.');
      return;
    }
    alert('Thank you! Your nutritious meal order has been successfully placed. Prep work is starting now!');
    setCartItems([]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Cart
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Review your customized daily portion
          </ThemedText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {cartItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="shopping-cart" size={48} color={theme.textSecondary} />
              </View>
              <ThemedText type="default" style={{ fontWeight: '600', marginTop: Spacing.four }}>
                Your cart is empty
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center', marginTop: Spacing.two, paddingHorizontal: Spacing.six }}>
                Browse our customized chef-curated meals to load calories and macronutrients!
              </ThemedText>
            </View>
          ) : (
            <>
              {/* Portion Metrics Panel */}
              <ThemedView type="backgroundElement" style={styles.portionPanel}>
                <View style={styles.panelHeader}>
                  <MaterialIcons name="analytics" size={18} color="#2ed573" />
                  <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>
                    Combined Order Nutrition
                  </ThemedText>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <ThemedText type="small" style={styles.metricLabel}>Total Energy</ThemedText>
                    <ThemedText type="default" style={[styles.metricValue, { color: '#2ed573' }]}>
                      {getSubtotalCalories()} kcal
                    </ThemedText>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View style={styles.metric}>
                    <ThemedText type="small" style={styles.metricLabel}>Total Protein</ThemedText>
                    <ThemedText type="default" style={[styles.metricValue, { color: '#7bed9f' }]}>
                      {getSubtotalProtein()}g
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>

              {/* Cart Items List */}
              <View style={styles.listContainer}>
                {cartItems.map((item) => (
                  <ThemedView key={item.id} type="backgroundElement" style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <ThemedText type="default" style={{ fontWeight: '600' }}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="small" style={styles.itemDesc}>
                        {item.desc}
                      </ThemedText>
                      <View style={styles.tagsContainer}>
                        <View style={styles.calorieTag}>
                          <MaterialIcons name="local-fire-department" size={12} color="#2ed573" />
                          <ThemedText type="smallBold" style={styles.tagText}>{item.calories}</ThemedText>
                        </View>
                        <View style={[styles.calorieTag, { backgroundColor: 'rgba(123, 237, 159, 0.08)' }]}>
                          <MaterialIcons name="fitness-center" size={12} color="#7bed9f" />
                          <ThemedText type="smallBold" style={[styles.tagText, { color: '#7bed9f' }]}>{item.protein} Protein</ThemedText>
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <ThemedText type="default" style={styles.itemPrice}>
                        ₹{(item.price * item.qty).toFixed(2)}
                      </ThemedText>
                      <View style={styles.qtyContainer}>
                        <Pressable onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}>
                          <MaterialIcons name="remove" size={16} color={theme.text} />
                        </Pressable>
                        <ThemedText type="default" style={styles.qtyText}>
                          {item.qty}
                        </ThemedText>
                        <Pressable onPress={() => updateQty(item.id, 1)} style={styles.qtyBtn}>
                          <MaterialIcons name="add" size={16} color={theme.text} />
                        </Pressable>
                      </View>
                    </View>
                  </ThemedView>
                ))}
              </View>

              {/* Order Summary Panel */}
              <ThemedView type="backgroundElement" style={styles.summaryPanel}>
                <View style={styles.summaryRow}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Subtotal</ThemedText>
                  <ThemedText type="smallBold">₹{subtotal.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Delivery Fee</ThemedText>
                  <ThemedText type="smallBold">₹{deliveryFee.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Est. Tax (8%)</ThemedText>
                  <ThemedText type="smallBold">₹{tax.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.totalDivider} />
                <View style={[styles.summaryRow, { marginTop: Spacing.one }]}>
                  <ThemedText type="default" style={{ fontWeight: '700' }}>Order Total</ThemedText>
                  <ThemedText type="default" style={{ fontWeight: '700', color: '#2ed573', fontSize: 18 }}>
                    ₹{total.toFixed(2)}
                  </ThemedText>
                </View>
              </ThemedView>

              {/* Glowing Checkout Button */}
              <Pressable
                onPress={handleCheckout}
                style={({ pressed }) => [
                  styles.checkoutButton,
                  pressed && styles.checkoutButtonPressed,
                ]}
              >
                <MaterialIcons name="shopping-cart-checkout" size={20} color="#ffffff" />
                <ThemedText style={styles.checkoutText}>
                  Place Order • ₹{total.toFixed(2)}
                </ThemedText>
              </Pressable>
            </>
          )}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six * 2,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  portionPanel: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Spacing.two,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  metricLabel: {
    opacity: 0.6,
    fontSize: 12,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 15,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContainer: {
    gap: Spacing.three,
  },
  itemCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Spacing.three,
  },
  itemInfo: {
    gap: Spacing.one,
  },
  itemDesc: {
    opacity: 0.6,
    lineHeight: 18,
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  calorieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
    gap: Spacing.one,
  },
  tagText: {
    color: '#2ed573',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: Spacing.two,
  },
  itemPrice: {
    fontWeight: '700',
    color: '#2ed573',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    width: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  summaryPanel: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: Spacing.one,
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#2ed573',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    shadowColor: '#2ed573',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  checkoutButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  checkoutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});

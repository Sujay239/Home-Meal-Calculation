import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';

// Local high-fidelity downloaded 3D graphic assets
const calculatorIcon = require('@/assets/images/splash/calculator.png');
const rupeeIcon = require('@/assets/images/splash/rupee.png');
const groceryIcon = require('@/assets/images/splash/grocery.png');
const receiptIcon = require('@/assets/images/splash/receipt.png');
const walletIcon = require('@/assets/images/splash/wallet.png');



// Structured, performance-friendly background particles
const PARTICLES = [
  { size: 8, left: '15%', top: '23%', duration: 16000, delay: 500 },
  { size: 9, left: '85%', top: '17%', duration: 21000, delay: 1000 },
  { size: 7, left: '12%', top: '11%', duration: 12000, delay: 200 },
  { size: 6, left: '88%', top: '85%', duration: 19000, delay: 1500 },
  { size: 9, left: '33%', top: '28%', duration: 20000, delay: 800 },
  { size: 10, left: '86%', top: '64%', duration: 15000, delay: 1200 },
  { size: 6, left: '68%', top: '34%', duration: 13000, delay: 400 },
  { size: 8, left: '22%', top: '65%', duration: 18000, delay: 700 },
  { size: 7, left: '78%', top: '48%', duration: 17000, delay: 900 },
  { size: 5, left: '80%', top: '75%', duration: 22000, delay: 1100 },
  { size: 4, left: '10%', top: '35%', duration: 14000, delay: 300 },
  { size: 9, left: '72%', top: '80%', duration: 19500, delay: 600 },
];

interface FloatingElementProps {
  children: React.ReactNode;
  style?: any;
  delay?: number;
  duration?: number;
  range?: number;
}

// Helper component for floating animation
function FloatingElement({
  children,
  style,
  delay = 0,
  duration = 5000,
  range = 18,
}: FloatingElementProps) {
  const translateY = useSharedValue(0);
  const rotateVal = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-range, { duration: duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(range, { duration: duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite
        true
      )
    );

    const targetRot = (Math.random() - 0.5) * 8; // -4 to 4 deg
    rotateVal.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(targetRot, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) }),
          withTiming(-targetRot, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotateVal.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

interface AmbientParticleProps {
  size: number;
  left: any;
  top: any;
  duration: number;
  delay: number;
}

// Background slow-floating ambient particles
function AmbientParticle({ size, left, top, duration, delay }: AmbientParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(Math.random() * 30 - 15, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(Math.random() * 30 - 15, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(Math.random() * 30 - 15, { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) }),
          withTiming(Math.random() * 30 - 15, { duration: duration * 1.1, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          left,
          top,
          borderRadius: size / 2,
        },
        animatedStyle,
      ]}
    />
  );
}

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [seqIndex, setSeqIndex] = useState(0);

  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  // Cards entrance animation values
  const topCardOpacity = useSharedValue(0);
  const topCardTranslateY = useSharedValue(30);
  const midCardOpacity = useSharedValue(0);
  const midCardTranslateY = useSharedValue(30);

  // Footer & Signature animation values
  const footerOpacity = useSharedValue(0);
  const signatureOpacity = useSharedValue(0);

  const finalScaleVal = useSharedValue(1.0);

  useEffect(() => {
    // 1. Calculation dynamic steps sequence loop (800ms per step)
    const seqTimer = setInterval(() => {
      setSeqIndex((prev) => {
        if (prev < 3) return prev + 1;
        clearInterval(seqTimer);
        return prev;
      });
    }, 800);

    // 2. Animate cards entry
    topCardOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    topCardTranslateY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    
    midCardOpacity.value = withDelay(600, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    midCardTranslateY.value = withDelay(600, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    // 3. Animate progress bar filling
    progressWidth.value = withTiming(100, { duration: 3200, easing: Easing.out(Easing.quad) });

    // 4. Animate footer and signature entry
    footerOpacity.value = withDelay(1000, withTiming(1, { duration: 800 }));
    signatureOpacity.value = withDelay(1800, withTiming(1, { duration: 800 }));

    // 5. Fade out entire overlay after calculations finish
    const fadeTimer = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 550, easing: Easing.inOut(Easing.ease) });
      overlayScale.value = withTiming(0.97, { duration: 550, easing: Easing.inOut(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
        }
      });
    }, 3600);

    return () => {
      clearInterval(seqTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  useEffect(() => {
    if (seqIndex === 3) {
      finalScaleVal.value = withTiming(1.1, { duration: 250 });
    } else {
      finalScaleVal.value = withTiming(1.0, { duration: 250 });
    }
  }, [seqIndex]);

  // Animate dynamic calculation sequence elements
  const getCalcValues = () => {
    if (seqIndex === 0) {
      return { step1: '', step2: '', final: '₹ 1,200', finalScale: 1.0 };
    } else if (seqIndex === 1) {
      return { step1: '', step2: '₹ 1,200', final: '₹ 2,450', finalScale: 1.0 };
    } else if (seqIndex === 2) {
      return { step1: '', step2: '₹ 2,450', final: '₹ 3,890', finalScale: 1.0 };
    } else {
      return { step1: '₹ 2,450', step2: '₹ 3,890', final: '₹ 5,120', finalScale: 1.1 };
    }
  };

  const calcVals = getCalcValues();

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  const topCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: topCardOpacity.value,
    transform: [{ translateY: topCardTranslateY.value }],
  }));

  const midCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: midCardOpacity.value,
    transform: [{ translateY: midCardTranslateY.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  const signatureAnimatedStyle = useAnimatedStyle(() => ({
    opacity: signatureOpacity.value,
  }));

  const finalAmountAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: finalScaleVal.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.outerContainer, overlayAnimatedStyle]}>
      {/* Premium background gradient mirroring code.html */}
      <LinearGradient
        colors={['#208AEF', '#005da8', '#f8f9ff']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Render ambient glowing background particles */}
      {PARTICLES.map((p, i) => (
        <AmbientParticle
          key={i}
          size={p.size}
          left={p.left}
          top={p.top}
          duration={p.duration}
          delay={p.delay}
        />
      ))}

      {/* Main Interactive Floating Asset Container */}
      <View style={styles.interactiveArea}>
        {/* Floating Calculator Icon (Top-Left) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { top: '15%', left: '8%' }]}
          delay={0}
          duration={5500}
          range={16}
        >
          <Image source={calculatorIcon} style={styles.floatingImage} resizeMode="contain" />
        </FloatingElement>

        {/* Floating Rupee Coin (Top-Right) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { top: '13%', right: '8%' }]}
          delay={500}
          duration={4800}
          range={20}
        >
          <Image source={rupeeIcon} style={styles.floatingImage} resizeMode="contain" />
        </FloatingElement>

        {/* Floating Grocery Bag (Mid-Left) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { top: '44%', left: '2%', width: 75, height: 75 }]}
          delay={1200}
          duration={6500}
          range={12}
        >
          <Image source={groceryIcon} style={styles.groceryImage} resizeMode="contain" />
        </FloatingElement>

        {/* Floating Receipt Icon (Mid-Right) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { top: '46%', right: '3%' }]}
          delay={800}
          duration={4200}
          range={24}
        >
          <Image source={receiptIcon} style={styles.floatingImage} resizeMode="contain" />
        </FloatingElement>

        {/* Floating Wallet Icon (Bottom-Right) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { bottom: '16%', right: '8%', width: 85, height: 85 }]}
          delay={1500}
          duration={6000}
          range={18}
        >
          <Image source={walletIcon} style={styles.walletImage} resizeMode="contain" />
        </FloatingElement>

        {/* Floating Culinary Restaurant Icon (Bottom-Left) */}
        <FloatingElement
          style={[styles.floatingIconWrapper, { bottom: '15%', left: '8%' }]}
          delay={2100}
          duration={5800}
          range={14}
        >
          <MaterialIcons name="restaurant" size={54} color="#ffffff" style={styles.restaurantIcon} />
        </FloatingElement>

        {/* --- Central Glassmorphic Dashboard Cards --- */}

        {/* 1. Monthly Expense Glass Card */}
        <Animated.View style={[styles.glassCard, styles.topCard, topCardAnimatedStyle]}>
          <ThemedText style={styles.cardLabel}>Monthly Expense</ThemedText>
          <ThemedText style={styles.cardMainValue}>₹ 5,120</ThemedText>
          <View style={styles.trendingContainer}>
            <MaterialIcons name="trending-up" size={15} color="#10B981" style={{ marginRight: 2 }} />
            <ThemedText style={styles.trendingText}>12.5%</ThemedText>
          </View>
        </Animated.View>

        {/* 2. Calculating Sequence Glass Card */}
        <Animated.View style={[styles.glassCard, styles.midCard, midCardAnimatedStyle]}>
          <ThemedText style={styles.cardLabelMini}>Calculating...</ThemedText>
          
          <View style={styles.sequenceContainer}>
            {calcVals.step1 ? (
              <>
                <ThemedText style={styles.seqStepText}>{calcVals.step1}</ThemedText>
                <MaterialIcons name="arrow-forward" size={14} color="rgba(11,28,48,0.4)" style={styles.arrowIcon} />
              </>
            ) : null}

            {calcVals.step2 ? (
              <>
                <ThemedText style={styles.seqStepText2}>{calcVals.step2}</ThemedText>
                <MaterialIcons name="arrow-forward" size={14} color="rgba(11,28,48,0.5)" style={styles.arrowIcon} />
              </>
            ) : null}

            <Animated.Text
              style={[
                styles.finalAmountText,
                finalAmountAnimatedStyle,
                {
                  fontWeight: seqIndex === 3 ? '700' : '600',
                  color: seqIndex === 3 ? '#005da8' : 'rgba(11,28,48,0.9)',
                }
              ]}
            >
              {calcVals.final}
            </Animated.Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer Branding & Loading Progress Section */}
      <View style={styles.footerContainer}>
        {/* Animated Brand Tagline */}
        <Animated.View style={[footerAnimatedStyle, { alignItems: 'center' }]}>
          <ThemedText style={styles.taglineText}>
            Calculate Together. Eat Better. Save More.
          </ThemedText>

          {/* Clean Loading Capsule */}
          <View style={styles.progressCapsuleBackground}>
            <Animated.View style={[styles.progressCapsuleFill, progressAnimatedStyle]} />
          </View>
        </Animated.View>

        {/* Custom Personal Signature from code.html */}
        <Animated.View style={[signatureAnimatedStyle]}>
          <ThemedText style={styles.signatureText}>
            Made with love by Sujay
          </ThemedText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Keep the standard AnimatedIcon export simple or map to a smaller branded component if needed
export function AnimatedIcon() {
  return null;
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 99999,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  interactiveArea: {
    flex: 1,
    width: '100%',
    maxWidth: 450,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingIconWrapper: {
    position: 'absolute',
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      web: {
        filter: 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.15))',
      },
    }),
  },
  floatingImage: {
    width: '100%',
    height: '100%',
    opacity: 0.95,
  },
  groceryImage: {
    width: 75,
    height: 75,
    opacity: 0.95,
  },
  walletImage: {
    width: 85,
    height: 85,
    opacity: 0.95,
  },
  restaurantIcon: {
    opacity: 0.85,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#005da8',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 12px 32px 0 rgba(0, 93, 168, 0.12)',
      },
    }),
  },
  topCard: {
    top: '20%',
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 160,
  },
  midCard: {
    top: '52%',
    paddingHorizontal: 24,
    paddingVertical: 18,
    width: '84%',
    maxWidth: 320,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#53606c',
    letterSpacing: 0.3,
  },
  cardLabelMini: {
    fontSize: 12,
    fontWeight: '500',
    color: '#53606c',
    marginBottom: 8,
  },
  cardMainValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#005da8',
    marginTop: 2,
  },
  trendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  trendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  sequenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  seqStepText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(11,28,48,0.5)',
  },
  seqStepText2: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(11,28,48,0.7)',
  },
  arrowIcon: {
    marginHorizontal: 6,
    opacity: 0.6,
  },
  finalAmountText: {
    fontSize: 17,
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 45,
    zIndex: 40,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#53606c',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 30,
  },
  progressCapsuleBackground: {
    width: 128,
    height: 5,
    backgroundColor: 'rgba(0, 93, 168, 0.12)',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 40,
  },
  progressCapsuleFill: {
    height: '100%',
    backgroundColor: '#005da8',
    borderRadius: 99,
  },
  signatureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005da8',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

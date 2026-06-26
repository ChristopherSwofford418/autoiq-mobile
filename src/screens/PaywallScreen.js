import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  connectIAP, disconnectIAP, getProducts, purchaseProduct,
  setPurchaseListener, checkExistingSubscription, PRODUCT_IDS,
} from '../lib/iap';
import { supabase } from '../lib/supabase';

const PRIVACY_URL = 'https://getautowizard.com/privacy';
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

const PREMIUM_FEATURES = [
  { icon: '🤖', title: 'Unlimited AI Diagnosis', desc: 'Photo + symptom diagnosis with no limits' },
  { icon: '🚗', title: 'Unlimited Vehicles', desc: 'Track your entire fleet or family vehicles' },
  { icon: '⏰', title: 'Smart Reminders', desc: 'Never miss an oil change or service interval' },
  { icon: '📊', title: 'Full Service History', desc: 'Complete logs with cost tracking & shop notes' },
  { icon: '🔧', title: 'All Service Types', desc: 'Track all 9 maintenance categories per vehicle' },
];

export default function PaywallScreen({ navigation }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    init();
    return () => { disconnectIAP(); };
  }, []);

  async function init() {
    await connectIAP();
    setPurchaseListener(
      (purchase) => {
        setPurchasing(false);
        Alert.alert('Welcome to Auto Wizard Pro! 🚗', 'Your subscription is active.', [
          { text: 'Let\'s Go!', onPress: () => navigation.goBack() }
        ]);
      },
      (code) => {
        setPurchasing(false);
        if (code && code !== 'E_USER_CANCELLED') {
          Alert.alert('Purchase Failed', `Error: ${code}`);
        }
      }
    );
    const products = await getProducts();
    if (products.length > 0) setProduct(products[0]);
    setLoading(false);
  }

  async function handlePurchase() {
    setPurchasing(true);
    try {
      await purchaseProduct(PRODUCT_IDS.MONTHLY);
    } catch (e) {
      setPurchasing(false);
      if (e.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', e.message);
      }
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const has = await checkExistingSubscription();
      if (has) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('autoiq_profiles').upsert({ id: user.id, subscribed: true });
        }
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'Great!', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for this account.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }

  const price = product?.localizedPrice || '$9.99';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🚗</Text>
          <Text style={styles.heroTitle}>Auto Wizard Pro</Text>
          <Text style={styles.heroSub}>Keep your car in peak condition with AI-powered maintenance intelligence.</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {PREMIUM_FEATURES.map(f => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          ))}
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>7-DAY FREE TRIAL</Text>
          </View>
          <Text style={styles.priceLine}>
            {loading ? <ActivityIndicator color="#fff" /> : `${price} / month`}
          </Text>
          <Text style={styles.priceNote}>Auto-renewable monthly subscription. Cancel anytime.</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaBtn} onPress={handlePurchase} disabled={purchasing || loading}>
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaBtnText}>Start Free Trial</Text>
              <Text style={styles.ctaBtnSub}>7 days free, then {price}/mo</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={restoring}>
          {restoring ? <ActivityIndicator color="#64748b" size="small" /> : <Text style={styles.restoreText}>Restore Purchases</Text>}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Auto Wizard Pro is an auto-renewable monthly subscription. Payment will be charged to your App Store / Google Play account at confirmation of purchase. The subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours before the current period ends. You can manage or cancel your subscription in your account settings after purchase.
        </Text>

        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20 },
  closeBtnText: { color: '#94a3b8', fontSize: 16 },
  container: { padding: 24, paddingTop: 32, paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 8 },
  heroSub: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  features: { gap: 12, marginBottom: 24 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0d1525', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIcon: { width: 44, height: 44, backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 22 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  featureDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  checkmark: { color: '#22c55e', fontSize: 18, fontWeight: '700' },
  pricingCard: {
    backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 18, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    marginBottom: 20,
  },
  trialBadge: {
    backgroundColor: '#3b82f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 12,
  },
  trialText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  priceLine: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  priceNote: { color: '#64748b', fontSize: 13 },
  ctaBtn: {
    backgroundColor: '#3b82f6', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  ctaBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  restoreBtn: { alignItems: 'center', padding: 14 },
  restoreText: { color: '#64748b', fontSize: 14 },
  legalText: { color: '#64748b', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 },
  legalLink: { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
  legalDivider: { color: '#475569', fontSize: 12 },
});

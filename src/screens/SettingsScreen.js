import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { connectIAP, checkExistingSubscription, disconnectIAP } from '../lib/iap';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      setProfile(p);
    }
    setLoading(false);
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      await connectIAP();
      const has = await checkExistingSubscription();
      await disconnectIAP();
      if (has && user) {
        await supabase.from('profiles').upsert({ id: user.id, subscribed: true });
        setProfile(p => ({ ...p, subscribed: true }));
        Alert.alert('Restored!', 'Your subscription is active.');
      } else {
        Alert.alert('No subscription found', 'Tap "Go Premium" to subscribe.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setRestoring(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Onboarding');
        }
      }
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account', style: 'destructive', onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'All your vehicles, service records, and diagnoses will be permanently deleted.',
              [
                { text: 'No, Keep My Account', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything', style: 'destructive', onPress: async () => {
                    setDeleting(true);
                    try {
                      if (user) {
                        await supabase.from('autoiq_vehicles').delete().eq('user_id', user.id);
                        await supabase.from('autoiq_diagnoses').delete().eq('user_id', user.id);
                        await supabase.from('profiles').delete().eq('id', user.id);
                      }
                      await supabase.auth.signOut();
                      navigation.replace('Onboarding');
                    } catch (e) {
                      Alert.alert('Error', 'Could not delete account. Please contact support.');
                    } finally {
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  }

  function SettingRow({ icon, label, onPress, danger, value, disabled }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Text style={styles.rowChevron}>›</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color="#3b82f6" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.profileEmail}>{user?.email || 'Not logged in'}</Text>
            <View style={[styles.subBadge, profile?.subscribed ? styles.subBadgeActive : null]}>
              <Text style={[styles.subBadgeText, profile?.subscribed ? styles.subBadgeTextActive : null]}>
                {profile?.subscribed ? '⭐ Premium' : '🆓 Free Plan'}
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription */}
        <Text style={styles.sectionHeader}>SUBSCRIPTION</Text>
        <View style={styles.section}>
          {!profile?.subscribed ? (
            <SettingRow icon="⭐" label="Go Premium" onPress={() => navigation.navigate('Paywall')} />
          ) : (
            <View style={styles.row}>
              <Text style={styles.rowIcon}>✅</Text>
              <Text style={styles.rowLabel}>Auto Wizard Pro Active</Text>
            </View>
          )}
          <SettingRow
            icon="🔄"
            label="Restore Purchases"
            onPress={handleRestore}
            disabled={restoring}
            value={restoring ? 'Checking...' : ''}
          />
        </View>

        {/* App */}
        <Text style={styles.sectionHeader}>APP</Text>
        <View style={styles.section}>
          <SettingRow icon="🔒" label="Privacy Policy" onPress={() => Linking.openURL('https://getautowizard.com/privacy')} />
          <SettingRow icon="📄" label="Terms of Service" onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')} />
        </View>

        {/* Account */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingRow icon="🚪" label="Sign Out" onPress={handleSignOut} />
          <SettingRow icon="🗑️" label="Delete Account" onPress={handleDeleteAccount} danger disabled={deleting} />
        </View>

        <Text style={styles.version}>Auto Wizard v1.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 20 },
  profileCard: {
    backgroundColor: '#0d1525', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileEmail: { color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginBottom: 6 },
  subBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20 },
  subBadgeActive: { backgroundColor: 'rgba(59,130,246,0.15)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  subBadgeText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  subBadgeTextActive: { color: '#3b82f6' },
  sectionHeader: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  section: { backgroundColor: '#0d1525', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: { fontSize: 18, width: 30 },
  rowLabel: { flex: 1, color: '#e2e8f0', fontSize: 15 },
  rowLabelDanger: { color: '#ef4444' },
  rowValue: { color: '#64748b', fontSize: 13, marginRight: 8 },
  rowChevron: { color: '#475569', fontSize: 18 },
  version: { color: '#374151', fontSize: 12, textAlign: 'center', marginTop: 8 },
});

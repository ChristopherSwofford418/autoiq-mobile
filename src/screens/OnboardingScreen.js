import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const STEPS = ['welcome', 'vehicle', 'done'];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function saveVehicle() {
    if (!year || !make || !model) {
      setError('Year, make, and model are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.replace('Auth');
        return;
      }
      const { error: err } = await supabase.from('autoiq_vehicles').insert({
        user_id: user.id,
        year: parseInt(year) || null,
        make: make.trim(),
        model: model.trim(),
        current_mileage: parseInt(mileage) || 0,
        nickname: nickname.trim() || `${year} ${make} ${model}`,
      });
      if (err) throw err;
      // Ensure profile row
      await supabase.from('autoiq_profiles').upsert({ id: user.id, subscribed: false });
      setStep(2);
    } catch (e) {
      setError(e.message || 'Could not save vehicle.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🚗</Text>
          <Text style={styles.heroTitle}>Welcome to Auto Wizard</Text>
          <Text style={styles.heroSub}>
            Track maintenance, diagnose issues with AI,{'\n'}and never miss a service again.
          </Text>
          <View style={styles.featureList}>
            {['🔧 Smart Maintenance Tracker', '🤖 AI Diagnosis from Photos', '📋 Full Service History', '⏰ Mileage & Time Reminders'].map(f => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.btnText}>Get Started Free</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.btnOutlineText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.stepTitle}>Add Your First Vehicle</Text>
            <Text style={styles.stepSub}>We'll set up maintenance tracking right away.</Text>

            <Text style={styles.label}>Year *</Text>
            <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="2020" placeholderTextColor="#475569" keyboardType="number-pad" maxLength={4} />

            <Text style={styles.label}>Make *</Text>
            <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Toyota" placeholderTextColor="#475569" />

            <Text style={styles.label}>Model *</Text>
            <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Camry" placeholderTextColor="#475569" />

            <Text style={styles.label}>Current Mileage</Text>
            <TextInput style={styles.input} value={mileage} onChangeText={setMileage} placeholder="45000" placeholderTextColor="#475569" keyboardType="number-pad" />

            <Text style={styles.label}>Nickname (optional)</Text>
            <TextInput style={styles.input} value={nickname} onChangeText={setNickname} placeholder="My Daily Driver" placeholderTextColor="#475569" />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.btn} onPress={saveVehicle} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save & Continue</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Step 2: done
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>✅</Text>
        <Text style={styles.heroTitle}>You're all set!</Text>
        <Text style={styles.heroSub}>Your vehicle has been added.{'\n'}Let's keep it running great.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('Main')}>
          <Text style={styles.btnText}>Go to My Garage</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  container: { flexGrow: 1, padding: 24 },
  bigEmoji: { fontSize: 80, marginBottom: 16 },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  heroSub: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  featureList: { alignSelf: 'stretch', gap: 10, marginBottom: 32 },
  featureItem: { color: '#94a3b8', fontSize: 15, paddingLeft: 4 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6, marginTop: 16 },
  stepSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: '#0d1525',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  btn: {
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
  },
  btnOutlineText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});

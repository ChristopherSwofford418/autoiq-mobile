import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const SERVICE_TYPES = [
  'Oil Change', 'Tires', 'Brakes', 'Air Filter', 'Cabin Filter',
  'Battery', 'Coolant', 'Transmission Fluid', 'Spark Plugs',
];

// Intervals in miles
const SERVICE_INTERVALS = {
  'Oil Change': 5000,
  'Tires': 50000,
  'Brakes': 30000,
  'Air Filter': 15000,
  'Cabin Filter': 15000,
  'Battery': 50000,
  'Coolant': 30000,
  'Transmission Fluid': 30000,
  'Spark Plugs': 30000,
};

function computeHealthScore(services, currentMileage) {
  if (!services || services.length === 0) return 0;
  let upToDate = 0;
  SERVICE_TYPES.forEach(type => {
    const last = services.find(s => s.service_type === type);
    if (!last) return;
    const interval = SERVICE_INTERVALS[type] || 10000;
    const nextDue = (last.mileage_at_service || 0) + interval;
    if (currentMileage <= nextDue) upToDate++;
  });
  const tracked = services.length > 0 ? SERVICE_TYPES.filter(t => services.find(s => s.service_type === t)).length : 0;
  if (tracked === 0) return 0;
  return Math.round((upToDate / SERVICE_TYPES.length) * 100);
}

function getNextServiceDue(services, currentMileage) {
  let soonest = null;
  let soonestMiles = Infinity;
  services.forEach(s => {
    const interval = SERVICE_INTERVALS[s.service_type] || 10000;
    const nextDue = (s.mileage_at_service || 0) + interval;
    const remaining = nextDue - currentMileage;
    if (remaining < soonestMiles) {
      soonestMiles = remaining;
      soonest = s.service_type;
    }
  });
  if (!soonest) return 'No services logged yet';
  if (soonestMiles <= 0) return `${soonest} — OVERDUE`;
  if (soonestMiles <= 500) return `${soonest} in ${soonestMiles} mi`;
  return `${soonest} in ${soonestMiles.toLocaleString()} mi`;
}

export default function GarageScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [form, setForm] = useState({ year: '', make: '', model: '', mileage: '', nickname: '', color: '' });

  useFocusEffect(
    useCallback(() => {
      loadVehicles();
    }, [])
  );

  async function loadVehicles() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: vData } = await supabase
      .from('autoiq_vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (!vData) { setLoading(false); return; }

    // Fetch latest service for each vehicle for health/next-due
    const enriched = await Promise.all(vData.map(async (v) => {
      const { data: svc } = await supabase
        .from('autoiq_services')
        .select('service_type, mileage_at_service, next_due_mileage, service_date')
        .eq('vehicle_id', v.id)
        .order('service_date', { ascending: false });
      const services = svc || [];
      // Dedupe — keep only most recent per type
      const seen = new Set();
      const latest = services.filter(s => {
        if (seen.has(s.service_type)) return false;
        seen.add(s.service_type);
        return true;
      });
      return {
        ...v,
        healthScore: computeHealthScore(latest, v.current_mileage),
        nextServiceDue: getNextServiceDue(latest, v.current_mileage),
      };
    }));

    setVehicles(enriched);
    setLoading(false);
  }

  async function addVehicle() {
    if (!form.year || !form.make || !form.model) {
      setAddError('Year, make, and model are required.');
      return;
    }
    setSaving(true);
    setAddError('');
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('autoiq_vehicles').insert({
      user_id: user.id,
      year: parseInt(form.year) || null,
      make: form.make.trim(),
      model: form.model.trim(),
      current_mileage: parseInt(form.mileage) || 0,
      nickname: form.nickname.trim() || `${form.year} ${form.make} ${form.model}`,
      color: form.color.trim(),
    });
    setSaving(false);
    if (error) { setAddError(error.message); return; }
    setShowAdd(false);
    setForm({ year: '', make: '', model: '', mileage: '', nickname: '', color: '' });
    loadVehicles();
  }

  function healthColor(score) {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>My Garage</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setShowAdd(true); setAddError(''); }}>
          <Text style={styles.addBtnText}>+ Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#3b82f6" size="large" /></View>
      ) : vehicles.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🚗</Text>
          <Text style={styles.emptyTitle}>No vehicles yet</Text>
          <Text style={styles.emptyText}>Add your first car to start tracking maintenance.</Text>
          <TouchableOpacity style={styles.addBigBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBigBtnText}>Add a Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('VehicleDetail', { vehicle: item })}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNickname}>{item.nickname || `${item.year} ${item.make} ${item.model}`}</Text>
                  <Text style={styles.cardSub}>{item.year} {item.make} {item.model}</Text>
                  <Text style={styles.cardMileage}>{(item.current_mileage || 0).toLocaleString()} miles</Text>
                </View>
                <View style={styles.healthBadge}>
                  <Text style={[styles.healthScore, { color: healthColor(item.healthScore) }]}>{item.healthScore}%</Text>
                  <Text style={styles.healthLabel}>Health</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <Text style={styles.nextDue}>⏱ {item.nextServiceDue}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Vehicle Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Vehicle</Text>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { label: 'Year *', key: 'year', placeholder: '2020', keyboardType: 'number-pad', maxLength: 4 },
                  { label: 'Make *', key: 'make', placeholder: 'Toyota' },
                  { label: 'Model *', key: 'model', placeholder: 'Camry' },
                  { label: 'Current Mileage', key: 'mileage', placeholder: '45000', keyboardType: 'number-pad' },
                  { label: 'Nickname', key: 'nickname', placeholder: 'My Daily Driver' },
                  { label: 'Color', key: 'color', placeholder: 'Silver' },
                ].map(f => (
                  <View key={f.key}>
                    <Text style={styles.label}>{f.label}</Text>
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#475569"
                      keyboardType={f.keyboardType || 'default'}
                      maxLength={f.maxLength}
                    />
                  </View>
                ))}
                {addError ? <Text style={styles.error}>{addError}</Text> : null}
                <TouchableOpacity style={styles.saveBtn} onPress={addVehicle} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Vehicle</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  addBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 13 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  addBigBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  addBigBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#0d1525', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardNickname: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  cardMileage: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  healthBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, minWidth: 64 },
  healthScore: { fontSize: 22, fontWeight: '800' },
  healthLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12 },
  nextDue: { fontSize: 13, color: '#94a3b8' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#0d1525', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#64748b', fontSize: 18, padding: 4 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#131d33', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, color: '#fff', fontSize: 15 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  saveBtn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 15, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

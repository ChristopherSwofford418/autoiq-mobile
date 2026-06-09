import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const SERVICE_TYPES = [
  'Oil Change', 'Tires', 'Brakes', 'Air Filter', 'Cabin Filter',
  'Battery', 'Coolant', 'Transmission Fluid', 'Spark Plugs', 'Other',
];

// Default next-due mileage intervals
const DEFAULT_INTERVALS = {
  'Oil Change': 5000,
  'Tires': 50000,
  'Brakes': 30000,
  'Air Filter': 15000,
  'Cabin Filter': 15000,
  'Battery': 50000,
  'Coolant': 30000,
  'Transmission Fluid': 30000,
  'Spark Plugs': 30000,
  'Other': 10000,
};

export default function AddServiceScreen({ route, navigation }) {
  const { vehicleId: preVehicleId, vehicleName: preVehicleName } = route.params || {};

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(preVehicleId || '');
  const [serviceType, setServiceType] = useState('Oil Change');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [nextDueMileage, setNextDueMileage] = useState('');
  const [cost, setCost] = useState('');
  const [shopName, setShopName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    // Auto-fill next due mileage when mileage or type changes
    if (mileage) {
      const interval = DEFAULT_INTERVALS[serviceType] || 10000;
      setNextDueMileage(String(parseInt(mileage) + interval));
    }
  }, [mileage, serviceType]);

  async function loadVehicles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('autoiq_vehicles').select('id, nickname, year, make, model, current_mileage').eq('user_id', user.id);
    if (data) {
      setVehicles(data);
      if (!preVehicleId && data.length > 0) {
        setSelectedVehicleId(data[0].id);
        if (data[0].current_mileage) setMileage(String(data[0].current_mileage));
      } else if (preVehicleId) {
        const v = data.find(x => x.id === preVehicleId);
        if (v?.current_mileage) setMileage(String(v.current_mileage));
      }
    }
  }

  async function save() {
    if (!selectedVehicleId) { setError('Please select a vehicle.'); return; }
    if (!serviceType) { setError('Please select a service type.'); return; }
    setError('');
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('autoiq_services').insert({
      vehicle_id: selectedVehicleId,
      user_id: user.id,
      service_type: serviceType,
      service_date: serviceDate || null,
      mileage_at_service: parseInt(mileage) || null,
      next_due_mileage: parseInt(nextDueMileage) || null,
      cost: parseFloat(cost) || null,
      shop_name: shopName.trim() || null,
      notes: notes.trim() || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    Alert.alert('Saved!', 'Service logged successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  }

  function vehicleLabel(v) {
    return v.nickname || `${v.year} ${v.make} ${v.model}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Service</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator color="#3b82f6" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Vehicle Picker */}
          {vehicles.length > 1 && (
            <>
              <Text style={styles.label}>Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={styles.chipRow}>
                  {vehicles.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.chip, selectedVehicleId === v.id && styles.chipActive]}
                      onPress={() => {
                        setSelectedVehicleId(v.id);
                        if (v.current_mileage) setMileage(String(v.current_mileage));
                      }}
                    >
                      <Text style={[styles.chipText, selectedVehicleId === v.id && styles.chipTextActive]}>
                        {vehicleLabel(v)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Service Type */}
          <Text style={styles.label}>Service Type *</Text>
          <View style={styles.typeGrid}>
            {SERVICE_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, serviceType === type && styles.typeChipActive]}
                onPress={() => setServiceType(type)}
              >
                <Text style={[styles.typeChipText, serviceType === type && styles.typeChipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date */}
          <Text style={styles.label}>Service Date</Text>
          <TextInput
            style={styles.input}
            value={serviceDate}
            onChangeText={setServiceDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#475569"
          />

          {/* Mileage */}
          <Text style={styles.label}>Mileage at Service</Text>
          <TextInput
            style={styles.input}
            value={mileage}
            onChangeText={setMileage}
            placeholder="45000"
            placeholderTextColor="#475569"
            keyboardType="number-pad"
          />

          {/* Next Due */}
          <Text style={styles.label}>Next Due Mileage (auto-filled)</Text>
          <TextInput
            style={styles.input}
            value={nextDueMileage}
            onChangeText={setNextDueMileage}
            placeholder="50000"
            placeholderTextColor="#475569"
            keyboardType="number-pad"
          />

          {/* Cost */}
          <Text style={styles.label}>Cost ($)</Text>
          <TextInput
            style={styles.input}
            value={cost}
            onChangeText={setCost}
            placeholder="49.99"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
          />

          {/* Shop */}
          <Text style={styles.label}>Shop Name</Text>
          <TextInput
            style={styles.input}
            value={shopName}
            onChangeText={setShopName}
            placeholder="Jiffy Lube, Dealer, etc."
            placeholderTextColor="#475569"
          />

          {/* Notes */}
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor="#475569"
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>💾 Save Service Log</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  backBtn: { padding: 8, minWidth: 70 },
  backText: { color: '#ef4444', fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  saveBtn: { padding: 8, minWidth: 70, alignItems: 'flex-end' },
  saveBtnText: { color: '#3b82f6', fontSize: 15, fontWeight: '700' },
  container: { padding: 20, paddingBottom: 40 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#0d1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, color: '#fff', fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0d1525', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0d1525', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  typeChipActive: { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6' },
  typeChipText: { color: '#64748b', fontSize: 13 },
  typeChipTextActive: { color: '#3b82f6', fontWeight: '700' },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
  submitBtn: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

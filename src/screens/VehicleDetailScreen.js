import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const SERVICE_TYPES = [
  { type: 'Oil Change', interval: 5000, icon: '🛢️' },
  { type: 'Tires', interval: 50000, icon: '🔄' },
  { type: 'Brakes', interval: 30000, icon: '🛑' },
  { type: 'Air Filter', interval: 15000, icon: '💨' },
  { type: 'Cabin Filter', interval: 15000, icon: '🌬️' },
  { type: 'Battery', interval: 50000, icon: '🔋' },
  { type: 'Coolant', interval: 30000, icon: '❄️' },
  { type: 'Transmission Fluid', interval: 30000, icon: '⚙️' },
  { type: 'Spark Plugs', interval: 30000, icon: '⚡' },
];

function getStatus(lastService, currentMileage) {
  if (!lastService) return 'unknown';
  const interval = SERVICE_TYPES.find(s => s.type === lastService.service_type)?.interval || 10000;
  const nextDue = (lastService.mileage_at_service || 0) + interval;
  const remaining = nextDue - currentMileage;
  if (remaining <= 0) return 'overdue';
  if (remaining <= interval * 0.1) return 'soon';
  return 'good';
}

function statusEmoji(status) {
  if (status === 'good') return '🟢';
  if (status === 'soon') return '🟡';
  if (status === 'overdue') return '🔴';
  return '⚪';
}

function statusText(status, lastService, currentMileage) {
  if (!lastService) return 'Never logged';
  const interval = SERVICE_TYPES.find(s => s.type === lastService.service_type)?.interval || 10000;
  const nextDue = (lastService.mileage_at_service || 0) + interval;
  const remaining = nextDue - currentMileage;
  if (status === 'overdue') return `Overdue by ${Math.abs(remaining).toLocaleString()} mi`;
  if (status === 'soon') return `Due in ${remaining.toLocaleString()} mi`;
  return `Due in ${remaining.toLocaleString()} mi`;
}

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicle: initialVehicle } = route.params;
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mileageInput, setMileageInput] = useState(String(initialVehicle.current_mileage || ''));
  const [savingMileage, setSavingMileage] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [])
  );

  async function loadServices() {
    setLoading(true);
    const { data } = await supabase
      .from('autoiq_services')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('service_date', { ascending: false });

    if (data) {
      // Keep only latest per type
      const seen = new Set();
      const latest = data.filter(s => {
        if (seen.has(s.service_type)) return false;
        seen.add(s.service_type);
        return true;
      });
      setServices(latest);
    }
    setLoading(false);
  }

  async function updateMileage() {
    const miles = parseInt(mileageInput);
    if (!miles || miles < 0) { Alert.alert('Invalid mileage'); return; }
    setSavingMileage(true);
    const { error } = await supabase
      .from('autoiq_vehicles')
      .update({ current_mileage: miles })
      .eq('id', vehicle.id);
    setSavingMileage(false);
    if (!error) {
      setVehicle(v => ({ ...v, current_mileage: miles }));
      Alert.alert('Updated', 'Mileage updated successfully.');
    }
  }

  async function deleteVehicle() {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.nickname}? All service history will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await supabase.from('autoiq_vehicles').delete().eq('id', vehicle.id);
            navigation.goBack();
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteVehicle} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Vehicle Header */}
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleEmoji}>🚗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}</Text>
            <Text style={styles.vehicleSub}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
            {vehicle.color ? <Text style={styles.vehicleColor}>{vehicle.color}</Text> : null}
          </View>
        </View>

        {/* Update Mileage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Mileage</Text>
          <View style={styles.mileageRow}>
            <TextInput
              style={styles.mileageInput}
              value={mileageInput}
              onChangeText={setMileageInput}
              keyboardType="number-pad"
              placeholder="Enter mileage"
              placeholderTextColor="#475569"
            />
            <TouchableOpacity style={styles.mileageBtn} onPress={updateMileage} disabled={savingMileage}>
              {savingMileage ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.mileageBtnText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          {loading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginTop: 16 }} />
          ) : (
            <View style={styles.checklist}>
              {SERVICE_TYPES.map(({ type, icon }) => {
                const last = services.find(s => s.service_type === type);
                const status = getStatus(last, vehicle.current_mileage);
                return (
                  <View key={type} style={styles.checkItem}>
                    <Text style={styles.checkIcon}>{icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkType}>{type}</Text>
                      <Text style={styles.checkStatus}>{statusText(status, last, vehicle.current_mileage)}</Text>
                      {last?.service_date ? (
                        <Text style={styles.checkDate}>Last: {last.service_date}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.statusEmoji}>{statusEmoji(status)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddService', { vehicleId: vehicle.id, vehicleName: vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}` })}
        >
          <Text style={styles.actionBtnText}>+ Log a Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => navigation.navigate('History', { vehicleId: vehicle.id })}
        >
          <Text style={styles.actionBtnOutlineText}>📋 View Service History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  backText: { color: '#3b82f6', fontSize: 17, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  vehicleCard: {
    backgroundColor: '#0d1525', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20,
  },
  vehicleEmoji: { fontSize: 40 },
  vehicleName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  vehicleSub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  vehicleColor: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  mileageRow: { flexDirection: 'row', gap: 10 },
  mileageInput: {
    flex: 1, backgroundColor: '#0d1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 13, color: '#fff', fontSize: 15,
  },
  mileageBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  mileageBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  checklist: { gap: 2 },
  checkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0d1525', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  checkIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  checkType: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
  checkStatus: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  checkDate: { fontSize: 11, color: '#475569', marginTop: 2 },
  statusEmoji: { fontSize: 18 },
  actionBtn: {
    backgroundColor: '#3b82f6', borderRadius: 14, padding: 15,
    alignItems: 'center', marginBottom: 10,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionBtnOutlineText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});

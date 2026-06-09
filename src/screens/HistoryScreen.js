import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const SERVICE_ICONS = {
  'Oil Change': '🛢️',
  'Tires': '🔄',
  'Brakes': '🛑',
  'Air Filter': '💨',
  'Cabin Filter': '🌬️',
  'Battery': '🔋',
  'Coolant': '❄️',
  'Transmission Fluid': '⚙️',
  'Spark Plugs': '⚡',
};

export default function HistoryScreen({ navigation, route }) {
  const preFilterVehicleId = route?.params?.vehicleId || null;
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(preFilterVehicleId);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: vData }, { data: sData }] = await Promise.all([
      supabase.from('autoiq_vehicles').select('id, nickname, year, make, model').eq('user_id', user.id).order('created_at'),
      supabase.from('autoiq_services').select('*, autoiq_vehicles(nickname, year, make, model)').eq('user_id', user.id).order('service_date', { ascending: false }),
    ]);

    setVehicles(vData || []);
    setServices(sData || []);
    setLoading(false);
  }

  const filtered = selectedVehicle
    ? services.filter(s => s.vehicle_id === selectedVehicle)
    : services;

  function vehicleName(svc) {
    const v = svc.autoiq_vehicles;
    if (!v) return 'Unknown Vehicle';
    return v.nickname || `${v.year} ${v.make} ${v.model}`;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Service History</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddService', {})}
        >
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Filter */}
      {vehicles.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedVehicle && styles.filterChipActive]}
            onPress={() => setSelectedVehicle(null)}
          >
            <Text style={[styles.filterChipText, !selectedVehicle && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {vehicles.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[styles.filterChip, selectedVehicle === v.id && styles.filterChipActive]}
              onPress={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
            >
              <Text style={[styles.filterChipText, selectedVehicle === v.id && styles.filterChipTextActive]}>
                {v.nickname || `${v.year} ${v.make}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color="#3b82f6" size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No service records yet</Text>
          <Text style={styles.emptyText}>Log your first service to start tracking history.</Text>
          <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('AddService', {})}>
            <Text style={styles.logBtnText}>Log a Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{SERVICE_ICONS[item.service_type] || '🔧'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardType}>{item.service_type}</Text>
                  <Text style={styles.cardVehicle}>{vehicleName(item)}</Text>
                </View>
                {item.cost ? <Text style={styles.cardCost}>${parseFloat(item.cost).toFixed(2)}</Text> : null}
              </View>
              <View style={styles.cardDetails}>
                {item.service_date ? (
                  <View style={styles.detailPill}>
                    <Text style={styles.detailText}>📅 {item.service_date}</Text>
                  </View>
                ) : null}
                {item.mileage_at_service ? (
                  <View style={styles.detailPill}>
                    <Text style={styles.detailText}>🛣️ {item.mileage_at_service.toLocaleString()} mi</Text>
                  </View>
                ) : null}
                {item.shop_name ? (
                  <View style={styles.detailPill}>
                    <Text style={styles.detailText}>🏪 {item.shop_name}</Text>
                  </View>
                ) : null}
              </View>
              {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  addBtnText: { color: '#3b82f6', fontWeight: '700', fontSize: 13 },
  filterRow: { marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0d1525', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterChipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  logBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: '#0d1525', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIcon: { fontSize: 26, width: 34 },
  cardType: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cardVehicle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardCost: { fontSize: 16, fontWeight: '700', color: '#22c55e' },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailPill: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  detailText: { color: '#94a3b8', fontSize: 12 },
  cardNotes: { color: '#64748b', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
});

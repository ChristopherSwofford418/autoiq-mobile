import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ScrollView, ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase, callAIProxy } from '../lib/supabase';

const SEVERITY_COLORS = {
  Low: '#22c55e',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

export default function DiagnoseScreen({ navigation }) {
  const [mode, setMode] = useState('symptom'); // 'symptom' | 'photo'
  const [symptom, setSymptom] = useState('');
  const [photo, setPhoto] = useState(null); // { uri, base64 }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!picked.canceled && picked.assets[0]) {
      await processPhoto(picked.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const taken = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!taken.canceled && taken.assets[0]) {
      await processPhoto(taken.assets[0].uri);
    }
  }

  async function processPhoto(uri) {
    try {
      // Compress to 512px wide
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.6, format: SaveFormat.JPEG, base64: true }
      );
      setPhoto({ uri: manipulated.uri, base64: manipulated.base64 });
      setResult(null);
    } catch (e) {
      Alert.alert('Error', 'Could not process photo.');
    }
  }

  async function diagnose() {
    if (mode === 'symptom' && !symptom.trim()) {
      setError('Please describe the symptom.');
      return;
    }
    if (mode === 'photo' && !photo) {
      setError('Please select or take a photo first.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      let messages;
      if (mode === 'photo') {
        messages = [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are an expert auto mechanic. Analyze this car photo and identify any visible problems. Return ONLY valid JSON (no markdown, no explanation): {"problem": "...", "severity": "Low|Medium|High|Critical", "cost_estimate": "$X-$Y", "is_urgent": true/false, "mechanic_tip": "Tell your mechanic: ..."}',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${photo.base64}` },
              },
            ],
          },
        ];
      } else {
        messages = [
          {
            role: 'user',
            content: `You are an expert auto mechanic. The driver says: "${symptom.trim()}". Return ONLY valid JSON (no markdown, no explanation): {"problem": "...", "severity": "Low|Medium|High|Critical", "cost_estimate": "$X-$Y", "is_urgent": true/false, "mechanic_tip": "Tell your mechanic: ..."}`,
          },
        ];
      }

      const content = await callAIProxy(messages, 'gpt-4o', 512);

      // Parse JSON — strip markdown fences if present
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
      }
      const parsed = JSON.parse(cleaned);
      setResult(parsed);

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('autoiq_diagnoses').insert({
          user_id: user.id,
          symptom: mode === 'symptom' ? symptom.trim() : null,
          problem: parsed.problem,
          severity: parsed.severity,
          cost_estimate: parsed.cost_estimate,
          is_urgent: parsed.is_urgent,
          mechanic_tip: parsed.mechanic_tip,
        });
      }
    } catch (e) {
      setError('Diagnosis failed. Please try again.');
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setSymptom('');
    setPhoto(null);
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>AI Diagnosis</Text>
          <Text style={styles.subtitle}>Describe a symptom or upload a photo of the problem.</Text>

          {!result ? (
            <>
              {/* Mode Toggle */}
              <View style={styles.toggle}>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'symptom' && styles.toggleActive]}
                  onPress={() => { setMode('symptom'); setPhoto(null); setError(''); }}
                >
                  <Text style={[styles.toggleText, mode === 'symptom' && styles.toggleTextActive]}>📝 Describe Symptom</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, mode === 'photo' && styles.toggleActive]}
                  onPress={() => { setMode('photo'); setSymptom(''); setError(''); }}
                >
                  <Text style={[styles.toggleText, mode === 'photo' && styles.toggleTextActive]}>📷 Take/Upload Photo</Text>
                </TouchableOpacity>
              </View>

              {mode === 'symptom' ? (
                <>
                  <TextInput
                    style={styles.textArea}
                    value={symptom}
                    onChangeText={setSymptom}
                    placeholder="e.g. Grinding noise when braking, Check engine light on, Car shakes at highway speed..."
                    placeholderTextColor="#475569"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                  <View style={styles.examples}>
                    <Text style={styles.examplesTitle}>Common symptoms:</Text>
                    {['Grinding when braking', 'Engine light on', 'Car pulls to one side', 'Rough idle', 'White smoke from exhaust'].map(ex => (
                      <TouchableOpacity key={ex} style={styles.exampleChip} onPress={() => setSymptom(ex)}>
                        <Text style={styles.exampleText}>{ex}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.photoSection}>
                  {photo ? (
                    <>
                      <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                      <TouchableOpacity style={styles.changePhotoBtn} onPress={() => setPhoto(null)}>
                        <Text style={styles.changePhotoBtnText}>Remove Photo</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoButtons}>
                      <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                        <Text style={styles.photoBtnEmoji}>📷</Text>
                        <Text style={styles.photoBtnText}>Take Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                        <Text style={styles.photoBtnEmoji}>🖼️</Text>
                        <Text style={styles.photoBtnText}>Upload Photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.diagnoseBtn, loading && styles.diagnoseBtnDisabled]}
                onPress={diagnose}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.diagnoseBtnText}> Analyzing...</Text>
                  </>
                ) : (
                  <Text style={styles.diagnoseBtnText}>🤖 Run AI Diagnosis</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* Result Card */
            <View>
              <View style={[styles.resultCard, { borderColor: SEVERITY_COLORS[result.severity] || '#3b82f6' }]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultEmoji}>{result.is_urgent ? '🚨' : '🔧'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultProblem}>{result.problem}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[result.severity] + '22', borderColor: SEVERITY_COLORS[result.severity] }]}>
                      <Text style={[styles.severityText, { color: SEVERITY_COLORS[result.severity] }]}>{result.severity} Severity</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.resultDivider} />

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Estimated Cost</Text>
                  <Text style={styles.resultValue}>{result.cost_estimate}</Text>
                </View>

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Urgency</Text>
                  <Text style={[styles.resultValue, { color: result.is_urgent ? '#ef4444' : '#22c55e' }]}>
                    {result.is_urgent ? '⚠️ Fix Soon' : '✅ Can Wait'}
                  </Text>
                </View>

                <View style={styles.resultDivider} />

                <Text style={styles.mechanicTitle}>What to tell your mechanic:</Text>
                <View style={styles.mechanicBox}>
                  <Text style={styles.mechanicText}>{result.mechanic_tip}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.diagnoseBtn} onPress={reset}>
                <Text style={styles.diagnoseBtnText}>🔄 New Diagnosis</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  toggle: {
    flexDirection: 'row', backgroundColor: '#0d1525', borderRadius: 12,
    padding: 4, marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#3b82f6' },
  toggleText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#fff' },
  textArea: {
    backgroundColor: '#0d1525', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, minHeight: 120,
  },
  examples: { marginTop: 16 },
  examplesTitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  exampleChip: {
    backgroundColor: '#0d1525', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignSelf: 'flex-start',
  },
  exampleText: { color: '#94a3b8', fontSize: 13 },
  photoSection: { marginBottom: 8 },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flex: 1, backgroundColor: '#0d1525', borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
  },
  photoBtnEmoji: { fontSize: 36, marginBottom: 8 },
  photoBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  photoPreview: { width: '100%', height: 200, borderRadius: 14, marginBottom: 12 },
  changePhotoBtn: { alignItems: 'center', padding: 10 },
  changePhotoBtnText: { color: '#ef4444', fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8, marginBottom: 4 },
  diagnoseBtn: {
    backgroundColor: '#3b82f6', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  diagnoseBtnDisabled: { backgroundColor: '#1e3a5f' },
  diagnoseBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultCard: {
    backgroundColor: '#0d1525', borderRadius: 18, padding: 20,
    borderWidth: 1.5, marginTop: 8,
  },
  resultHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 4 },
  resultEmoji: { fontSize: 36 },
  resultProblem: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8, flexShrink: 1 },
  severityBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  severityText: { fontSize: 12, fontWeight: '700' },
  resultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultLabel: { color: '#64748b', fontSize: 14 },
  resultValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  mechanicTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  mechanicBox: {
    backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: '#3b82f6',
  },
  mechanicText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
});

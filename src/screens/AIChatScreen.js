import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { callAIProxy } from '../lib/supabase';

const SYSTEM_PROMPT = `You are Auto Wizard, an expert AI auto mechanic and car care advisor. You help car owners with:
- Diagnosing symptoms and warning lights
- Understanding maintenance schedules (oil changes, tire rotations, brake inspections, etc.)
- Estimating repair costs and urgency
- Deciding whether to DIY or go to a mechanic
- Understanding what mechanics tell them
- General car care tips to extend vehicle life

Be friendly, clear, and practical. Always prioritize safety — if something is urgent or dangerous, say so clearly. Keep answers concise but complete. When relevant, ask follow-up questions about the vehicle year, make, model, and mileage to give better advice.`;

const QUICK_PROMPTS = [
  'What does the check engine light mean?',
  'How often should I change my oil?',
  'My brakes are squeaking — is it serious?',
  'What maintenance does my car need at 30,000 miles?',
  'How do I know if my tires need replacing?',
];

export default function AIChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: '0',
      role: 'assistant',
      text: "Hi! I'm your Auto Wizard AI mechanic 🔧\n\nAsk me anything about your car — symptoms, maintenance schedules, warning lights, or repair costs. I'm here to help!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build conversation history for the API (exclude the welcome message)
      const history = messages
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.text }));

      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: userText },
      ];

      const reply = await callAIProxy(apiMessages, 'gpt-4o', 600);
      const assistantMsg = { id: (Date.now() + 1).toString(), role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "Sorry, I couldn't connect right now. Please check your connection and try again.",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <Text style={styles.aiLabel}>🔧 Auto Wizard</Text>
        )}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.aiText]}>
          {item.text}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Mechanic</Text>
        <Text style={styles.headerSub}>Powered by Auto Wizard AI</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingBubble}>
              <Text style={styles.aiLabel}>🔧 Auto Wizard</Text>
              <View style={styles.typingDots}>
                <ActivityIndicator color="#3b82f6" size="small" />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {messages.length <= 1 && (
        <View style={styles.quickPrompts}>
          <Text style={styles.quickTitle}>Quick questions</Text>
          <View style={styles.quickList}>
            {QUICK_PROMPTS.map((q, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} onPress={() => send(q)}>
                <Text style={styles.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your car..."
            placeholderTextColor="#475569"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1a' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#3b82f6', marginTop: 2, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1d4ed8',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#0d1525',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  aiLabel: { color: '#3b82f6', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#e2e8f0' },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#0d1525',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 14,
    marginBottom: 12,
    maxWidth: '60%',
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: '#64748b', fontSize: 14 },
  quickPrompts: { paddingHorizontal: 16, paddingBottom: 8 },
  quickTitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  quickList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    backgroundColor: '#0d1525',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  quickChipText: { color: '#94a3b8', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0d1525',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1e3a5f' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: -2 },
});

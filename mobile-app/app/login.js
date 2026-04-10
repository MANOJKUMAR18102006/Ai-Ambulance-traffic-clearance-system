import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { loginApi, registerApi, setAuthToken } from '../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEATURES = [
  { icon: '🚦', label: 'Smart Signals', desc: 'Auto green corridor' },
  { icon: '🗺️', label: 'Live Routing', desc: 'ORS optimized' },
  { icon: '📡', label: 'Real-time', desc: 'Live tracking' },
];

const ROLES = [
  { value: 'driver', icon: '🚑', label: 'Driver', desc: 'Ambulance operator' },
  { value: 'admin', icon: '🛡️', label: 'Admin', desc: 'Traffic authority' },
];

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'driver' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await loginApi(form.email, form.password);
      } else {
        if (!form.name) { Alert.alert('Missing name', 'Please enter your full name.'); setLoading(false); return; }
        data = await registerApi(form.name, form.email, form.password, form.role);
      }
      setAuthToken(data.token);
      await login(data.user, data.token);
      router.replace(data.user.role === 'admin' ? '/admin' : '/driver');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Something went wrong. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🚑</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>AmbulanceAI</Text>
              <Text style={styles.logoSub}>Smart Green Corridor System</Text>
            </View>
          </View>

          {/* Live indicator */}
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE SYSTEM ACTIVE</Text>
          </View>

          {/* Feature cards */}
          <View style={styles.featureRow}>
            {FEATURES.map(f => (
              <View key={f.label} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.cardSub}>
              {mode === 'login' ? 'Sign in to your dashboard' : 'Register to get started'}
            </Text>

            {/* Toggle */}
            <View style={styles.toggle}>
              {['login', 'register'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                    {m === 'login' ? '🔐 Sign In' : '✨ Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Name (register only) */}
            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={v => set('name', v)}
                  placeholder="John Doe"
                  placeholderTextColor="#475569"
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={v => set('email', v)}
                placeholder="you@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={form.password}
                  onChangeText={v => set('password', v)}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Role (register only) */}
            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Role</Text>
                <View style={styles.roleRow}>
                  {ROLES.map(r => (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => set('role', r.value)}
                      style={[styles.roleCard, form.role === r.value && styles.roleCardActive]}
                    >
                      <Text style={styles.roleIcon}>{r.icon}</Text>
                      <Text style={[styles.roleLabel, form.role === r.value && styles.roleLabelActive]}>
                        {r.label}
                      </Text>
                      <Text style={styles.roleDesc}>{r.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign In →' : 'Create Account →'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Switch mode */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                <Text style={styles.switchLink}>
                  {mode === 'login' ? 'Register' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Demo credentials */}
            <View style={styles.demoBox}>
              <Text style={styles.demoText}>
                Demo: admin@demo.com · driver@demo.com{'\n'}Password: demo1234
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f1e' },
  kav: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logoBadge: { width: 48, height: 48, backgroundColor: '#dc2626', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  logoEmoji: { fontSize: 24 },
  logoTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  logoSub: { color: '#94a3b8', fontSize: 12 },

  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  liveDot: { width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4 },
  liveText: { color: '#f87171', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  featureRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  featureCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10,
  },
  featureIcon: { fontSize: 20, marginBottom: 4 },
  featureLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  featureDesc: { color: '#64748b', fontSize: 10 },

  card: {
    backgroundColor: '#0d1b2a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 20,
  },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: '#94a3b8', fontSize: 13, marginBottom: 20 },

  toggle: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#dc2626' },
  toggleText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },

  inputGroup: { marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  eyeIcon: { fontSize: 16 },

  roleRow: { flexDirection: 'row', gap: 10 },
  roleCard: {
    flex: 1, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  roleCardActive: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)' },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  roleLabelActive: { color: '#fff' },
  roleDesc: { color: '#475569', fontSize: 10 },

  submitBtn: {
    backgroundColor: '#dc2626', borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    marginTop: 4, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' },
  switchText: { color: '#64748b', fontSize: 12 },
  switchLink: { color: '#f87171', fontSize: 12, fontWeight: '700' },

  demoBox: {
    marginTop: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  demoText: { color: '#475569', fontSize: 11, textAlign: 'center', lineHeight: 18 },
});
